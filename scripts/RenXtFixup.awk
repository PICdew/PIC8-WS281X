#12/4/13
BEGIN{ leader(); }
/WREG/{ wreg(); }
$0 !~ /WREG/ { other(); }
END{ trailer(); }
#asm fixups:
#- remove: "movwf gbl_wreg"
#- remove: "movf *_wreg, w"
#- replace: "clrf <proc>_wreg" with "movlw 0"
#- replace: "decf gbl_wreg, f"  with  "addlw -1"
#- replace: "movlw ##; xorwf gbl_wreg, f"  with  "xorlw ##"
#//- replace: append callee of retlw with asm movwf _WREG
#- replace: "btfs<polarity> var,bit; goto $+2; single instr" with "btfs<flipped>; single instr"
#- replace: "movf <var>, w; movwf gbl_wreg; lsrf gbl_wreg, f; movf gbl_wreg, w" with "lsrf <var>, w"
# 3/4/13 DJ added SWOPCODE for WS2811 on PIC16F1827
# 3/24/13 DJ added MOVIW, MOVWI
# 4/12/13 DJ added ABSDIFF for 8-bit jump offset mgmt
# 4/25/13 DJ added ATADRS to allow more precise placement of code
# 5/4/13  DJ added LEZ
# 3/20/14 DJ added indf1_auto* for parallel ws2811
#wreg-related fixups:
function wreg()
{
#	print "WREG: " $0;
	if (either()) return;
	if (($1 ~ /^(SAFE-)?CALL/) || ($1 == "GOTO")) { other(); return; } #kludge: wasn't really a WREG instr
	if ($2 == "EQU") { ++wreg_fixes["discard-alloc"]; buf[++buflen] = INDIC $0; return; }
	if ($1 == "CLRF") { ++wreg_fixes["unary"]; buf[++buflen] = "\tMOVLW 0 " INDIC $0 PCL(); ++NextAdrs[curpage]; return; }
	if (($1 == "INCF") && ($3 == "F")) { ++wreg_fixes["unary"]; buf[++buflen] = "\tADDLW 1 " INDIC $0 PCL(); ++NextAdrs[curpage]; return; }
	if (($1 == "DECF") && ($3 == "F")) { ++wreg_fixes["unary"]; buf[++buflen] = "\tADDLW 0xFF " INDIC $0 PCL(); ++NextAdrs[curpage]; return; }
	if (($1 == "DECF") && ($3 == "W"))
	{
		++wreg_fixes["unary"]; buf[++buflen] = "\tADDLW 0xFF " INDIC $0 PCL(); ++NextAdrs[curpage];
		buf[++buflen] = "\tWARN \"[CAUTION] W might be trashed here in " funcname "\"";
		return;
	}
	if (($1 == "DECFSZ") && ($3 == "F"))
	{
#		buf[++buflen] = "\tADDLW ~0 " INDIC $0 PCL(); ++NextAdrs[curpage];
#		buf[++buflen] = "\tBTFSS STATUS, Z " INDIC PCL(); ++NextAdrs[curpage];
#		buf[++buflen] = "\tDECWSZ " INDIC $0 PCL(); ++NextAdrs[curpage]; #NOTE: should be +2 for 16F688
		buf[++buflen] = gensub(/gbl_WREG/, "WREG", 1, $0) " " INDIC $0 PCL(); ++NextAdrs[curpage];
		return;
	}
	if (($1 == "BTFSC") || ($1 == "BTFSS"))
	{
		buf[++buflen] = gensub(/gbl_WREG/, "WREG", 1, $0) " " INDIC $0 PCL(); ++NextAdrs[curpage];
		return;
	}
	if ($1 == "BSF") { ++wreg_fixes["setbit"]; buf[++buflen] = "\tIORLW " hex(power2[strtonum(substr($2, length($2), 1))]) " " INDIC $0; ++NextAdrs[curpage]; return; }
	if ($1 == "BCF") { ++wreg_fixes["setbit"]; buf[++buflen] = "\tANDLW ~" hex(power2[strtonum(substr($2, length($2), 1))]) " " INDIC $0; ++NextAdrs[curpage]; return; }
	if ($1 == "COMF") { ++wreg_fixes["comf"]; buf[++buflen] = "\tXORLW 0xFF " INDIC $0; ++NextAdrs[curpage]; return; }
	if ((($1 == "LSRF") || ($1 == "RRF")) && ($3 == "F")) #shift source value rather than W
	{
		shfop = $1;
		for (prev = buflen; prev > buflen - 10; --prev)
			if (buf[prev] ~ /^[\t ]*;/) continue; #skip commented lines
			else if (buf[prev] ~ /^[\t ]+BCF STATUS,C/) continue; #skip clear carry instr
			else if (buf[prev] ~ /^[\t ]+MOVF [A-Za-z0-9_]+(\+D'[0-9]+')?, W/)
			{
				++wreg_fixes["reduce-" shfop];
				#errmsg("found " shfop " source: " buf[prev]);
				newinstr = gensub(/MOVF/, shfop, 1, buf[prev]);
				buf[prev] = INDIC buf[prev];
				buf[++buflen] = newinstr " " INDIC $0 PCL(); #replaced instr; overall adrs !changed
				return;
			}
			else if (match(buf[prev], /^[\t ]+MOVWF ([A-Za-z0-9_]+(\+D'[0-9]+')?)/, parts))
			{
				++wreg_fixes["redir-" shfop];
				#errmsg("found " shfop " source: " buf[prev]);
				buf[++buflen] = "\t" shfop " " parts[1] ", W " INDIC $0 PCL(); ++NextAdrs[curpage];
				return;
			}
			else prev = -1; #anything else between prevents this shortcut
		errmsg("couldn't find " shfop " source for '" $0 "'");
	}
#	if (($1 == "BTFSC") && ($2 ~ /,[0-9]$/)) #convert to ANDLW; NOTE: destroys W
	if (($1 == "MOVF") && ($3 == "W")) { ++wreg_fixes["discard-load"]; buf[++buflen] = INDIC $0 PCL(); return; }
	if (($1 == "MOVF") && ($3 == "F")) { ++wreg_fixes["discard-load"]; buf[++buflen] = INDIC $0 PCL(); return; } #IS THIS CORRECT?
	if ($1 == "MOVWF") { ++wreg_fixes["discard-save"]; buf[++buflen] = INDIC $0 PCL(); return; }
	if (($1 == "XORWF") || ($1 == "IORWF") || ($1 == "ANDWF") || ($1 == "ADDWF") || ($1 == "SUBWF"))
#		if ($3 == "F")
		for (prev = buflen; prev > buflen - 10; --prev)
		{
#			if (buf[prev] ~ /^[\t ]+MOVF [A-Za-z0-9_]+, W/) { prevop = buf[prev]; break; }
			if (buf[prev] ~ /^[\t ]+B[SC]F STATUS, RP/) continue; #skip bank sel
			if (buf[prev] ~ /^[\t ]+MOVLB/) continue; #skip bank sel
			if (buf[prev] ~ /^[\t ]+MOVLW/) #convert to immediate operand
			{
				newinstr = gensub(/MOV/, substr($1, 1, 3), 1, buf[prev]);
				buf[prev] = INDIC buf[prev];
				++wreg_fixes["reduce-binop"]; buf[++buflen] = newinstr " " INDIC $0 PCL(); #replaced instr; overall adrs !changed
				if ($1 == "SUBWF") buf[++buflen] = "\tWARN \"[CAUTION] OPERANDS SWAPPED in " funcname "\"";
#			else if (funcname ~ /^io_cancel/) buf[++buflen] = "\tWARN \"[DEBUG] upon '" $0 "' ins '" buf[prev] "', commented out '" buf[prev - 1] "'\"";
				return;
			}
			#else errmsg("no prev1 '" buf[buflen] "'");
			if (buf[prev] ~ /^[\t ]+MOVF [A-Za-z0-9_]+(\+D'[0-9]+')?, W/) #NOTE: this swaps operands
			{
				newinstr = gensub(/MOVF/, $1, 1, buf[prev]);
				buf[prev] = INDIC buf[prev];
				++wreg_fixes["reduce-binop"]; buf[++buflen] = newinstr " " INDIC $0 PCL(); #replaced instr; overall adrs !changed
				if ($1 == "SUBWF") buf[++buflen] = "\tWARN \"[CAUTION] OPERANDS SWAPPED in " funcname "\"";
				return;
			}
			#else errmsg("no prev2 '" buf[buflen] "'");
			errmsg("couldn't find " $1 " source for '" $0 "'");
			break;
		}
	if (either()) return;
	errmsg("UNKN '" $0 "'");
	buf[++buflen] = $0 PCL();
#	++unknowns; no_flush(); print "UNKN: " $0;
}
function either()
{
	if (($1 != "DW") && inatadrs) { buf[++buflen] = "\tORG " inatadrs; inatadrs = ""; }
	if ($2 == "EQU") #remove defs for pseudo regs to help catch unhandled cases
	{
		if (index(",gbl_WREG,gbl_NEVER,gbl_LEZ,gbl_BANKSELECT_,gbl_BANKSELECTINDIR_,gbl_RETLW_,gbl_RETURN_,gbl_ABSGOTO_,gbl_ABSCALL_,gbl_ABSLABEL_,gbl_ABSDIFF_,gbl_ABSDIFFXOR_,gbl_INGOTOC_,gbl_ONPAGE_,gbl_ATADRS_,gbl_TRAMPOLINE_,gbl_SET_EEADR_,gbl_NOOP_,gbl_MOVIW_,gbl_MOVWI_,gbl_INDF_PREINC_,gbl_INDF_PREDEC_,gbl_INDF_POSTINC_,gbl_INDF_POSTDEC_,gbl_INDF1_PREINC_,gbl_INDF1_PREDEC_,gbl_INDF1_POSTINC_,gbl_INDF1_POSTDEC_,gbl_SWOPCODE_,gbl_PROGPAD_,gbl_MARKER_,gbl_NOFLIP_,PROG_ADJUST_,", "," $1 ",")) buf[++buflen] = INDIC $0;
		else buf[++buflen] = $0;
		return 1;
	}
	if ($0 ~ /function begin/) { ++stats["func-begin"]; funcname = buf[buflen]; buf[++buflen] = $0; return 1; } #NOTE: this occurs on comment line, so place it before blank line check
	if ($0 ~ /function end/) { funcname = ""; buf[++buflen] = $0; return 1; }
	if ($0 ~ /^[A-Za-z0-9_]([\t ]*\:[\t ]*)?/) #label only
	{
		if (int(NextAdrs[curpage] / 0x800) != curpage) if (++ovfl[curpage] < 5) errmsg("page " curpage " overflowed to " hex(NextAdrs[curpage]) " at " $0);
#		if ($1 == "main") errmsg("main is on page " curpage " adrs " NextAdrs[curpage] ": " $0 " " NR);
		if ($1 ~ /^(_startup|main|abslabel)/) funcpage[$1] = curpage;
		labels[$1] = buflen + 1; #remember location so label can be checked for goto/return later
		state = 0;
		for (prev = buflen; prev > buflen - 10; --prev) #check for btfs[sc] var,bit; goto $+2; single instr
			if (!state && (buf[prev] ~ "^[\\t ]+GOTO[\\t ]+" $1 "[^A-Za-z_0-9]")) #redundant goto
			{
				++other_fixes["useless-goto"];
				buf[prev] = INDIC buf[prev] " useless jump"; --NextAdrs[curpage]; #reclaim recovered prog space
				if (buf[prev - 1] ~ /^[\t ]*BTFS[SC]/) { buf[prev - 1] = INDIC buf[prev - 1] " useless conditional on useless jump"; --NextAdrs[curpage]; }
				break;
			}
			else if (buf[prev] !~ /^[\t ]*(;|$)/)
				switch (state)
				{
					case 0: #found target instr
						++state;
						continue;
					case 1:
						if (buf[prev] ~ "[\\t ]*GOTO[\\t ]+" $0 "([\\t ;]|$)") state = prev; #found jump over target instr
						else prev = -1; #stop checking; doesn't match
						continue;
					default:
						if (match(buf[prev], /NOFLIP/)) { state = 10; break; }
						if (match(buf[prev], /^[\t ]+BTFS(S|C)[\t ]+[A-Za-z0-9_](\+D'[0-9]+')?/, parts)) #found btf; flip it
							if (buf[prev - 1] !~ /^[\t ]+BTFS(S|C)[\t ]+[A-Za-z0-9_](\+D'[0-9]+')?/)
								if (buf[prev] !~ /gbl_NEVER/) #kludge: don't mess with kludged code
								{
									if (state == 10) { buf[prev] = buf[prev] INDIC " no flip"; prev = -1; break; }
									++other_fixes["reduce-jumpover (btf-flip)"];
									buf[prev] = substr(buf[prev], 1, parts[1, "start"] - 1) ((parts[1] == "S")? "C": "S") substr(buf[prev], parts[1, "start"] + 1) " " buf[prev] " flipped";
									buf[state] = INDIC buf[state] " flipped"; --NextAdrs[curpage]; #reclaim recovered prog space
									buf[++buflen] = $0 INDIC " NOT bypassed"; #leave label intact in case somewhere else jumps to it
									return 1;
								}
						prev = -1; #stop checking; doesn't match
				}
		buf[++buflen] = $0;
		return 1;
	}
	return 0;
}
#non-wreg fixups:
function other()
{
	opc = $1 " " $2;
	if (either()) return;
	if ($0 ~ /^[\t ]*(;|$)/) { buf[++buflen] = $0; return; } #blank line
	if ($0 ~ /^[\t ]+(include[\t ]|EQU[\t ]|END$)/) #directive
	{
		buf[++buflen] = $0;
		if (($1 == "include") && match($2, /^"P(1[26]F[0-9]+)\.inc"$/, parts)) device(parts[1]);
		return;
	}

	if ($0 ~ /MARKER_/) { buf[++buflen] = INDIC $0 PCL(); return; } #used to help find code
	if (($1 == "MOVLP") || (opc ~ /^B[SC]F PCLATH,[34]$/)) { ++other_fixes["discard-movlp"]; buf[++buflen] = INDIC $0; return; } #addresses changed; fix them later
	if ((opc == "BTFSS STATUS,Z") && match(buf[buflen], /^[\t ]+(DECF)[\t ]/, parts)) #reduce to decfsz
	{
		++other_fixes["reduce-decfsz"];
		buf[buflen] = substr(buf[buflen], 1, parts[1, "start"] + 3) "SZ" substr(buf[buflen], parts[1, "start"] + 4) " " INDIC buf[buflen];
		buf[++buflen] = INDIC $0 " reduce decfsz";
		return;
	}

	if ((funcname !~ /init/) && match($0, /^[\t ]+B([CS])F[\t ]+STATUS,[\t ]+RP1/, parts)) #redundant
	{
		++other_fixes["bcf-rp1"];
		if (parts[1] == "S") errmsg("bank sel 2/3: " $0);
		buf[++buflen] = INDIC $0 " redundant";
		return;
	}

	if (match(opc, /^(MOVWF|CLRF)[\t ]+gbl_SWOPCODE_(\+D'([0-9]+)')?$/, parts)) #move/swap opcodes
	{
#		swopreg = parts[3]? 1 * parts[3]: 0;
		swopinfo[2] = parts[3]? 1 * parts[3]: 0; #dest ofs
		if (parts[1] == "CLRF") buf[++buflen] = "\tMOVLW 0x0"; #kludge: satisfy extraction logic below
		for (prev = buflen; prev > buflen - 10; --prev) #look for corresponding load
			if (buf[prev] ~ /^[\t ]*;/) continue; #skip commented lines
			else if (match(buf[prev], /^[\t ]+MOVLW[\t ]+0x([0-9A-Fa-f]+)([\t ;]|$)/, parts))
			{
				buf[prev] = INDIC buf[prev] " extracted swopcode[" swopinfo[2] "] value"; #no? --NextAdrs[curpage]; #reclaim
				buf[++buflen] = INDIC $0 " extracted swopcode[" swopinfo[2] "] value"; #++NextAdrs[curpage];
#				swopinfo[swopreg] = parts[1];
				swopinfo[1] = parts[1]; #src ofs
				swopinfo[0] = "02"; #move
#				#errmsg("swopreg " swopreg ", val " parts[1] ", cur line: " $0 ", prev line: " buf[prev]);
#				if (swopreg != 0) return;
#				++other_fixes["swap-opcodes"];
#				switch (swopinfo[0])
#				{
#					case 1:
#						++other_fixes["swopcode-swap"];
##						buf[++buflen] = "\tWARN \"TODO: swap opcodes '" swopinfo[1] " and '" swopinfo[2] "\"";
#						buf[++buflen] = "\tSWOPCODE " swopinfo[1] "," swopinfo[2] "," swopinfo[0];
#						return;
#					case 2:
						++other_fixes["swopcode-move"];
##						buf[++buflen] = "\tWARN \"TODO: move opcode from '" swopinfo[1] " to '" swopinfo[2] "\"";
						buf[++buflen] = "\tSWOPCODE " swopinfo[1] "," swopinfo[2] "," swopinfo[0];
						return;
#					default:
#						errmsg("unknown swopcode mode: " swopinfo[0]);
#				}
#				return;
			}
		errmsg("can't find swopcode value: " $0);
	}

	if (match(opc, /^(MOVWF|CLRF)[\t ]+gbl_ABSDIFF(XOR)?_(\+D'([0-9]+)')?$/, parts)) #distance between 2 labels
	{
		absdiffinfo[2] = parts[4]? 1 * parts[4]: 0; #dest ofs
		absdiffinfo[0] = (parts[2] == "XOR")? "XORLW": "MOVLW";
		if (parts[1] == "CLRF") buf[++buflen] = "\tMOVLW 0x0"; #kludge: satisfy extraction logic below
#		for (prev = buflen; prev > buflen - 10; --prev) #look for corresponding load
#			if (buf[prev] ~ /^[\t ]*;/) continue; #skip commented lines
#			else if (match(buf[prev], /^[\t ]+MOVLW[\t ]+0x([0-9A-Fa-f]+)([\t ;]|$)/, parts))
		if (match(prevstmt(), /^[\t ]+MOVLW[\t ]+0x([0-9A-Fa-f]+)([\t ;]|$)/, parts))
			{
				buf[prev] = INDIC buf[prev] " extracted absdiff[" absdiffinfo[2] "] value"; #no? --NextAdrs[curpage]; #reclaim
				buf[++buflen] = INDIC $0 " extracted absdiffcode[" absdiffinfo[1] "] value"; #++NextAdrs[curpage];
				absdiffinfo[1] = 1 * parts[1]; #src ofs
				++other_fixes["absdiff-" absdiffinfo[0]];
				buf[++buflen] = "\t" absdiffinfo[0] " (abslabel" absdiffinfo[1] " - abslabel" absdiffinfo[2] ")";
				return;
			}
		errmsg("can't find absdiff value: " $0);
	}

	if (match(opc, /^(MOVWF|CLRF)[\t ]+gbl_NOFLIP_(\+D'([0-9]+)')?$/, parts)) #inhibit instr flip temporarily
	{
		if (parts[1] == "CLRF") buf[++buflen] = "\tMOVLW 0x0"; #kludge: satisfy extraction logic below
		if (match(prevstmt(), /^[\t ]+MOVLW[\t ]+0x([0-9A-Fa-f]+)([\t ;]|$)/, parts))
			{
				buf[prev] = INDIC buf[prev] " extracted noflip value"; #no? --NextAdrs[curpage]; #reclaim
				buf[++buflen] = INDIC $0 " extracted noflip value " parts[1]; #++NextAdrs[curpage];
				noflip = buflen + parts[1]; #how long to leave it off
				++other_fixes["noflip"];
				return;
			}
		errmsg("can't find noflip value: " $0);
	}
	if (match(opc, /^(MOVWF|CLRF) gbl_PROGPAD_$/, parts)) #pad/check prog space
	{
		if (parts[1] == "CLRF") { buf[++buflen] = "\tMOVLW 0x0"; ++NextAdrs[curpage]; } #kludge: satisfy extraction logic below
#		for (prev = buflen; prev > buflen - 10; --prev) #look for corresponding load
#			if (buf[prev] ~ /^[\t ]*;/) continue; #skip commented lines
#			else if (match(buf[prev], /^[\t ]+MOVLW[\t ]+(0x[0-9A-Fa-f]+)([\t ;]|$)/, parts))
		if (match(prevstmt(), /^[\t ]+MOVLW[\t ]+(0x[0-9A-Fa-f]+)([\t ;]|$)/, parts))
			{
				padlen = strtonum(parts[1]); #anchor or expected length
				buf[prev] = INDIC buf[prev] " extracted progpad value " padlen PCL(); --NextAdrs[curpage]; #reclaim
				++other_fixes["progpad-" (padlen? "pad": "init")];
				if (!padlen) buf[++buflen] = "abslabel" (999 + ++uniqid) ": " INDIC $0 PCL();
				else buf[++buflen] = "\tif $ - abslabel" (999 + uniqid) " != D'" padlen "' " INDIC $0 "\n\t\tERROR \"[ERROR] Prog pad mismatch: got \"#v($ - abslabel" (999 + uniqid) ")\", expected \"#v(D'" padlen "')\"\"\n\telse\n\t\t;WARN \"[INFO] Prog space correctly aligned at \"#v($)\"\"\n\tendif";
				return;
			}
		errmsg("can't find progpad value: " $0);
	}

	if (match(opc, /^(MOVWF|CLRF)[\t ]+gbl_ATADRS_(\+D'([0-9]+)')?$/, parts)) #force to specified address
	{
		if (!atadrswarn++) errmsg("atadrs not quite implemented");
		byteofs = parts[3]? 1 * parts[3]: 0; #byte ofs
		if (parts[1] == "CLRF") buf[++buflen] = "\tMOVLW 0x0"; #kludge: satisfy extraction logic below
#		for (prev = buflen; prev > buflen - 10; --prev) #look for corresponding load
#			if (buf[prev] ~ /^[\t ]*;/) continue; #skip commented lines
#			else if (match(buf[prev], /^[\t ]+MOVLW[\t ]+0x([0-9A-Fa-f]+)([\t ;]|$)/, parts))
		if (match(prevstmt(), /^[\t ]+MOVLW[\t ]+(0x[0-9A-Fa-f]+)([\t ;]|$)/, parts))
			{
				atadrs = byteofs? and(atadrs, 0xff) + 0x100 * strtonum(parts[1]): and(atadrs, 0xff00) + strtonum(parts[1]);
				inatadrs = 0;
				buf[prev] = INDIC buf[prev] " extracted adrs[ " byteofs "] now = " atadrs PCL(); #--NextAdrs[curpage]; #reclaim
				++other_fixes["atadrsx4"];
				buf[++buflen] = INDIC $0 PCL();
				return;
			}
		errmsg("can't find atadrs value: " $0);
	}
	if (($1 == "DW") && atadrs && (atadrs != 65534))
	{
		if (!inatadrs) { inatadrs = "svpcl_" FNR; buf[++buflen] = "\tconstant " inatadrs " = $\n\tORG " hex(atadrs); }
		instr = (atadrs >= 0xF000)? gensub(/DW/, "DE", 1, $0): $0;
		buf[++buflen] = instr INDIC $0 " pcl=" hex(atadrs); ++atadrs;
		return;
	}

#TODO: MOVLW, CLRF gbl_BANKSELECT for const vals? (not recommended because BSR might be redundant)
	if (opc ~ /(MOVWF|CLRF) gbl_BANKSELECT_/) #drop extraneous instr (bank already selected)
	{
		++other_fixes["bank-select"];
		if (buf[buflen] ~ /MOVF[\t ]+[A-Za-z0-9_]+(\+D'[0-9]+')?,[\t ]+W/)
		{
			buf[buflen] = INDIC buf[buflen]; " bank selected"; --NextAdrs[curpage];
		}
		else errmsg("bank sel not needed here " $0);
		return;
	}
#TODO: 16F688 needs to set IRP instead of RP0/RP1
#16F182X needs to set fsrh
#	if (opc == "MOVWF gbl_BANKSELECTINDIR_") #set fsrh/status.irp
#	{
#		++other_fixes["bank-select"];
#		if (buf[buflen] ~ /MOVF[\t ]+[A-Za-z0-9_]+,[\t ]+W/)
#		{
#			buf[buflen] = INDIC buf[buflen]; " bank selected"; --NextAdrs[curpage];
#		}
#		else errmsg("bank sel not needed here " $0);
#		return;
#	}
	if (match(opc, /^(MOVWF|CLRF) gbl_RETLW_/, parts))
	{
		++other_fixes["retlw"];
		if (parts[1] == "CLRF") { buf[++buflen] = Unconditional("\tretlw 0" INDIC $0 PCL()); ++NextAdrs[curpage]; return; }
		if (buf[buflen] ~ /RETLW/)
		{
			buf[++buflen] = buf[buflen] " " INDIC $0 PCL(); ++NextAdrs[curpage]; #repeat prev value
			return;
		}
		if (buf[buflen] !~ /MOVLW/) errmsg("can't find retlw value: " $0 " , prev " buf[buflen]);
		buf[buflen] = gensub(/MOVLW/, "RETLW", 1, buf[buflen]) " " INDIC $0;
		return;
	}
	if (opc ~ /^B[SC]F gbl_RETURN_,[0-9]/) #hard return
	{
		++other_fixes["hard-return"];
		buf[++buflen] = Unconditional("\treturn" INDIC $0 PCL()); ++NextAdrs[curpage];
		return;
	}

#obsolete
#	if (match(opc, /^B(S|C)F gbl_(MOVIW|MOVWI)_(\+D'([0-9]+)')?,([0-9])/, parts)) #load/store indirect
#	{
#		++other_fixes[tolower(parts[2])];
#		switch (parts[4] " " parts[5])
#		{
#			case "8 0": fsrmode = "++FSR#"; break;
#			case "8 1": fsrmode = "--FSR#"; break;
#			case "8 2": fsrmode = "FSR#++"; break;
#			case "8 3": fsrmode = "FSR#--"; break;
#			default: fsrmode = "FSR#[" ((8 * parts[4] + parts[5]) - 0x20) "]";
#		}
#		buf[++buflen] = "\t" parts[2] " " gensub(/#/, (parts[1] == "C")? "0": "1", 1, fsrmode) " " INDIC $0 PCL(); NextAdrs[curpage] += movwisize;
#		return;
#	}
	if (match(opc, /^(MOVWF|MOVF|CLRF) gbl_INDF(1?)_(PREINC|PREDEC|POSTINC|POSTDEC)_/, parts)) #load/store indirect (no offset)
	{
		++other_fixes[tolower("indf_" parts[3])];
		switch (parts[1] " " parts[3])
		{
			case "MOVWF PREINC": fsrmode = (movwisize == 1)? "MOVWI ++FSR#": "INCF FSR#, F\n\tMOVWF INDF#"; break;
			case "MOVWF PREDEC": fsrmode = (movwisize == 1)? "MOVWI --FSR#": "DECF FSR#, F\n\tMOVWF INDF#"; break;
			case "MOVWF POSTINC": fsrmode = (movwisize == 1)? "MOVWI FSR#++": "MOVWF INDF#\n\tINCF FSR#, F"; break;
			case "MOVWF POSTDEC": fsrmode = (movwisize == 1)? "MOVWI FSR#--": "MOVWF INDF#\n\tDECF FSR#, F"; break;
			case "MOVF PREINC": fsrmode = (movwisize == 1)? "MOVIW ++FSR#": "INCF FSR#, F\n\tMOVF INDF#, W"; break;
			case "MOVF PREDEC": fsrmode = (movwisize == 1)? "MOVIW --FSR#": "DECF FSR#, F\n\tMOVF INDF#, W"; break;
			case "MOVF POSTINC": fsrmode = (movwisize == 1)? "MOVIW FSR#++": "MOVF INDF#, W\n\tINCF FSR#, F"; break;
			case "MOVF POSTDEC": fsrmode = (movwisize == 1)? "MOVIW FSR#--": "MOVF INDF#, W\n\tDECF FSR#, F"; break;
#use movwi/moviw so ++/-- is 16-bit
			case "CLRF PREINC": fsrmode = (movwisize == 1)? "MOVLW 0\n\tMOVWI ++FSR#": "INCF FSR#, F\n\tCLRF INDF#"; break;
			case "CLRF PREDEC": fsrmode = (movwisize == 1)? "MOVLW 0\n\tMOVWI --FSR#": "DECF FSR#, F\n\tCLRF INDF#"; break;
			case "CLRF POSTINC": fsrmode = (movwisize == 1)? "MOVLW 0\n\tMOVWI FSR#++": "CLRF INDF#\n\tINCF FSR#, F"; break;
			case "CLRF POSTDEC": fsrmode = (movwisize == 1)? "MOVLW 0\n\tMOVWI FSR#--": "CLRF INDF#\n\tDECF FSR#, F"; break;
			default: errmsg("unhandled indirect: " opc);
		}
		buf[++buflen] = "\t" gensub(/#/, (parts[2]? "1": "0"), "g", fsrmode) " " INDIC $0 PCL(); NextAdrs[curpage] += movwisize;
		return;
	}

	if (match($0, /^[\t ]+MOVF[\t ]+([A-Za-z0-9_]+(\+D'[0-9]+')?)[\t ]*,[\t ]*W/, parts))
		for (prev = buflen; prev > buflen - 10; --prev) #look for redundant load
			if (buf[prev] ~ /^[\t ]*;/) continue; #skip commented lines
			else if (buf[prev] ~ /^[\t ]+(CLRF|GOTOC-START)[\t ]/) continue; #doesn't affect W
			else if (buf[prev] ~ "^[\\t ]+MOVWF[\\t ]+" parts[1] "([\\t ;]|$)")
			{
				#errmsg("redundant: '" buf[prev] "' matches ^[\\t ]+MOVWF[\\t ]+" parts[1] "([\\t ;]|$) in '" $0 "'");
				++other_fixes["redundant-load"];
				buf[++buflen] = INDIC $0 " redundant"; #++NextAdrs[curpage];
				return;
			}
			else prev = -1; #anything else between makes it not redundant
	if (match(opc, /^B[SC]F gbl_NOOP_,([0-7])/, parts)) #noop special cases
	{
		++other_fixes["noop"];
		switch (parts[1])
		{
#			case "?": #no nop
#				buf[++buflen] = INDIC $0 PCL();
#				break;
			case "0": #single (for orthogonality)
				buf[++buflen] = "\tnop" INDIC $0 PCL(); ++NextAdrs[curpage];
				break;
			case "1": #2 nop with 1 instr
				buf[++buflen] = "\tgoto $+1" INDIC $0 PCL(); ++NextAdrs[curpage];
				break;
#			case "2": #4 nop with 2 instr
#				buf[++buflen] = "\tcall $+1" INDIC $0 PCL() "\n\treturn;"; NextAdrs[curpage] += 2;
#				break;
			default:
				errmsg("unhandled noop: " $0);
		}
		return;
	}
#	if (opc == "DW 0x2FFF") # gotoc start #|| (opc ~ /^CALL GOTOC_star/)
	if (opc ~ /^BSF gbl_INGOTOC_,[0-7]/) #gotoc start
	{
		if (doing_gotoc) errmsg("gotoc nesting: got '" $0 "' when already had '" buf[doing_gotoc] "'");
#		if (buf[buflen] ~ /MOVLP 0x00/) { ++other["discard-movlp"]; --buflen; }
		++other_fixes["gotoc-start"]; buf[++buflen] = "\tGOTOC-START " NR " " hex(NextAdrs[curpage]) " " INDIC $0 PCL();
		doing_gotoc = buflen; #remember start location
		buf[++buflen] = ";placeholder for gotoc jump";
		buf[++buflen] = ";placeholder for org";
		buf[++buflen] = ";placeholder for warning msg";
#		NextAdrs[curpage] += 1; #2; #assume at least 2 instr - NO; use TRAMPOLINE to explicitly pad
		NextAdrs[curpage] += (pageselsize != 1)? 1 + numbits(int(NextAdrs[curpage] / 256)): 1;
		return;
	}
#	if (opc == "DW 0x2FFE") # gotoc end #|| (opc ~ /^CALL GOTOC_end/)
	if (match(opc, /^BCF gbl_INGOTOC_,([0-7])/, parts)) #gotoc end
	{
		gotoc_warnonly = (parts[1] == "7");
		++other_fixes["gotoc-" (gotoc_warnonly? "warn": "end")];
		if (!doing_gotoc) { buf[++buflen] = INDIC $0 " unmatched gotoc" PCL(); return; }
#		if (doing_gotoc && (pass1pad["gotoc_" doing_gotoc])) buf[++buflen] = "\tPASS1PAD " pass1pad["gotoc_" doing_gotoc] " " INDIC $0;
		if (!match(buf[doing_gotoc], /^[\t ]+GOTOC-START ([0-9]+) (0x[0-9A-Fa-f]+)/, parts)) errmsg("can't find gotoc start in '" buf[doing_gotoc] "'");
		else if (gotoc_warnonly) #use real addresses
		{
			buf[doing_gotoc] = "gotoc_start" doing_gotoc ": " INDIC buf[doing_gotoc] " ;GOTOC-warn" PCL();
#NOTE: requires MPASM 8.92
			buf[++buflen] = "\tif ($ / 0x100) != (gotoc_start" doing_gotoc " / 0x100) " INDIC $0 PCL() "\n\t\tERROR \"[ERROR] Gotoc body spans pages: starts \"#v(gotoc_start" doing_gotoc " / 0x100)\", ends \"#v($ / 0x100)\"\"\n\telse\n\t\tWARN \"[INFO] Gotoc body length okay: \"#v($ - gotoc_start" doing_gotoc ")\"\"\n\tendif";
#broken	in MPASM 8.86		buf[++buflen] = "\tif ($ >> 8) != (gotoc_start" doing_gotoc " >> 8) " INDIC $0 PCL() "\n\t\tERROR \"[ERROR] Gotoc body spans pages: starts \"#v(gotoc_start" doing_gotoc " / 0x100)\", ends \"#v($ / 0x100)\"\"\n\telse\n\t\tWARN \"[INFO] Gotoc body length okay: \"#v($ - gotoc_start" doing_gotoc ")\"\"\n\tendif";
#			buf[++buflen] = "\tconstant gotoc1_chk" doing_gotoc " = $ / 0x100\n\tconstant gotoc2_chk" doing_gotoc " = gotoc_start" doing_gotoc "/ 0x100\n\tif gotoc1_chk" doing_gotoc " != gotoc2_chk" doing_gotoc " " INDIC $0 PCL() "\n\t\tERROR \"[ERROR] Gotoc body spans pages: starts \"#v(gotoc_start" doing_gotoc " / 0x100)\", ends \"#v($ / 0x100)\"\"\n\telse\n\t\tWARN \"[INFO] Gotoc body length okay: \"#v($ - gotoc_start" doing_gotoc ")\"\"\n\tendif";
#kludge			buf[++buflen] = "\tWARN \"Check if gotoc body spans pages: starts gotoc_start" doing_gotoc ", ends $\""; #MPASM broken, so just tell user to check it
		}
		else
		{
			if (!(funcname in funcpage)) errmsg("don't know what page " funcname " is on");
#NOTE: PCLATH changes when setting PCL in MPSIM, but this can be ignored
#however, PCLATH might have changed in another GOTOC, so always set PCLATH here:
			pagechanged = 1; #(8 * funcpage[funcname]) != int(NextAdrs[curpage] / 256); #always do this
			pagesel = (pagechanged)? "\tMOVLP " hex(int(NextAdrs[curpage] / 256)): ""; #update PCLATH if different than func start
#too accurate			pagesel = (pagechanged)? "\tMOVLP $/0x100 ;" hex(int(NextAdrs[curpage] / 256)): ""; #update PCLATH if different than func start
			pageseldesc = (pageselsize != 1)? "1+" numbits(int(NextAdrs[curpage] / 256)) " bits in pagesel; ": "";
			buf[doing_gotoc] = pagesel INDIC pageseldesc buf[doing_gotoc]; #replaced instr; overall adrs !changed
# svadj = NextAdrs[curpage] " => " 1 + numbits(int(NextAdrs[curpage] / 256));
			if (pagechanged && (pageselsize != 1)) NextAdrs[curpage] += 1 + numbits(int(NextAdrs[curpage] / 256)); #+ 2; #kludge: +2 in case off by a little
# debug("gotoc[" buflen "]: pgch? " pagechanged ", adrs " svadj);
			if (upper_byte(NextAdrs[curpage]) > upper_byte(strtonum(parts[2]) + 1)) #spans pages
			{
				pagesel = "\tMOVLP " hex(int(NextAdrs[curpage] / 256)); #update PCLATH if different than func start
				buf[doing_gotoc] = pagesel INDIC buf[doing_gotoc]; #replaced instr; overall adrs !changed
				skip = upper_byte(NextAdrs[curpage]) - strtonum(parts[2]);
				++doing_gotoc; buf[doing_gotoc] = "\tGOTO " hex(upper_byte(NextAdrs[curpage])) " " INDIC buf[doing_gotoc];
				++doing_gotoc; buf[doing_gotoc] = "\torg " hex(upper_byte(NextAdrs[curpage])) " " INDIC buf[doing_gotoc];
				++doing_gotoc; buf[doing_gotoc] = "\tWARN \"[INFO] skipping ahead " upper_byte(NextAdrs[curpage]) "-" strtonum(parts[2]) "=" skip " words for gotoc\"" INDIC buf[doing_gotoc];
				if (nextstmt(doing_gotoc + 1) ~ /ADDWF gbl_pcl, F/) #replace with indirect jump to correct address to reduce overhead
				{
					buf[doing_gotoc - 2] = gensub(/ADDWF gbl_pcl, F/, "MOVWF gbl_pcl", 1, buf[nexti]) " " INDIC buf[doing_gotoc - 2];
					buf[nexti] = INDIC buf[nexti];
				}
				NextAdrs[curpage] += skip;
				buf[++buflen] = INDIC $0 " ;GOTOC-end" PCL();
				if (upper_byte(NextAdrs[curpage]) > upper_byte(strtonum(parts[2]))) buf[++buflen] = "\tERROR \"[ERROR] Gotoc body spans pages: starts " hex(NextAdrs[curpage] - skip) " (moved from " hex(strtonum(parts[2])) "), ends " hex(NextAdrs[curpage]) "\""; #NextAdrs ~= $ (not exact)
				else buf[++buflen] = "\tERROR \"[INFO] Gotoc body does not span pages: starts " hex(NextAdrs[curpage] - skip) " (moved from " hex(strtonum(parts[2])) "), ends " hex(NextAdrs[curpage]) "\""; #NextAdrs ~= $ (not exact)
			}
			else { buf[++buflen] = INDIC $0 " ;GOTOC-end, reclaimed jump instr" PCL(); } # --NextAdrs[curpage]; }
		}
		doing_gotoc = 0;
		return;
	}
#	if (opc ~ "DW 0x2FF[CD]") #put code on page 0 or 1
	if (match(opc, /B[SC]F gbl_ONPAGE_,([0-7])/, parts)) #put code on specified page
	{
		if (buf[buflen] ~ /function begin/)
		{
			newpage = parts[1]; #strtonum("0x2ffd") - strtonum($2);
			if (funcname == "") errmsg("in unknown func");
			if ((funcname in funcpage) && (funcpage[funcname] != newpage)) errmsg(funcname " page mismatch: is on " newpage ", thought it was on " funcpage[funcname]);
			funcpage[funcname] = newpage;
			funcadrs[funcname] = NextAdrs[newpage];
#			errmsg("func " funcname " is on page " pagenum);
			#errmsg("want adrs " $2 " = " strtonum($2) ", page " newpage);
			++other_fixes["on-page"]; buf[buflen - 2] = "\tORG " hex(NextAdrs[newpage]) " " INDIC buf[buflen - 2];
			buf[++buflen] = INDIC $0 "; ONPAGE(" newpage ")";
			curpage = newpage;
			return;
		}
		errmsg("couldn't find function header for '" $0 "', prev line was " buf[buflen]);
	}
#	if (opc ~ "DW 0x2FFB") #set eeadrh/eeadrl to following prog adrs
	if (opc ~ /B[SC]F gbl_SET_EEADR_,[0-7]/) #set eeadrh/eeadrl to following prog adrs
	{
		++other_fixes["eeadrs-prog"];
		adrs = NextAdrs[curpage] + 5 + bankselsize;
		buf[++buflen] = INDIC $0;
		buf[++buflen] = "\tbanksel EEADRH" INDIC $0 PCL(); NextAdrs[curpage] += bankselsize;
		buf[++buflen] = "\tMOVLW HIGH($+5); " hex(adrs/256) PCL(); ++NextAdrs[curpage];
		buf[++buflen] = "\tMOVWF EEADRH" PCL(); ++NextAdrs[curpage];
		buf[++buflen] = "\tMOVLW LOW($+3); " hex(adrs%256) PCL(); ++NextAdrs[curpage];
		buf[++buflen] = "\tMOVWF EEADRL" PCL(); ++NextAdrs[curpage];
		buf[++buflen] = "\tRETURN" PCL(); ++NextAdrs[curpage];
		if (NextAdrs[curpage] != adrs) errmsg("wrong target address: got " hex(NextAdrs[curpage]) " but expected " hex(adrs));
		return;
	}

#	if (opc ~ /BTFSC gbl_LEZ,/) #expand into <= 0
#	{
#		++other_fixes["lez"];
#		buf[++buflen] = "\tBTFSS gbl_status,2 " INDIC $0 PCL(); ++NextAdrs[curpage]; #Z
#		buf[++buflen] = "\tBTFSS gbl_status,0 " INDIC PCL(); ++NextAdrs[curpage]; #C (Borrow)
#		return;
#	}
#	if (opc ~ /BTFSS gbl_LEZ,/) #expand into > 0
#	{
#		++other_fixes["gtz"];
#		buf[++buflen] = "\tBTFSS gbl_status,0 " INDIC $0 PCL(); ++NextAdrs[curpage]; #C (Borrow)
#		buf[++buflen] = "\tBTFSS gbl_status,2 " INDIC PCL(); ++NextAdrs[curpage]; #Z
#		return;
#	}

#	if (match(opc, /^CALL ABSGOTO_([0-3])_/, parts)) opc = "DW 0x2FF" (parts[1] + 4);
#	if (opc ~ "DW 0x2FF[0-9]") #abs call/jump
	if (match(opc, /B[SC]F gbl_ABSGOTO_(\+D'([0-9]+)')?,([0-7])/, parts)) #go to arbitrary adrs
	{
		which = 8 * ("0" parts[2]) + parts[3];
		++other_fixes["absgoto"];
#		which = (($1 == "CALL")? strtonum("0x2FF4") + parts[1]: strtonum($2)) - strtonum("0x2ff0");
#		if (which < 4) buf[++buflen] = "abslabel" (which - 0) ": " INDIC $0 PCL();
#		else if (which < 8) { buf[++buflen] = "\tgoto abslabel" (which - 4) INDIC $0 PCL(); ++NextAdrs[curpage]; }
#		else { buf[++buflen] = "\tcall abslabel" (which - 8) INDIC $0 PCL(); ++NextAdrs[curpage]; }
#no		buf[++buflen] = "\tSAFE-GOTO abslabel" which " " curpage " " NR INDIC $0 PCL(); ++NextAdrs[curpage];
		buf[++buflen] = Unconditional("\tSAFE-GOTO abslabel" which " " int(NextAdrs[curpage] / 0x800) " vs. " curpage " " NR INDIC $0 PCL()); NextAdrs[curpage] += 1; #2;
#		buf[++buflen] = "\tGOTO abslabel" which PCL(); ++NextAdrs[curpage];
#		buf[++buflen] = "\tWARN \"[CAUTION] check page/bank here";
		return;
	}
	if (match(opc, /B[SC]F gbl_ABSCALL_(\+D'([0-9]+)')?,([0-7])/, parts)) #call arbitrary adrs
	{
		++other_fixes["abscall"];
		which = 8 * ("0" parts[2]) + parts[3];
		buf[++buflen] = "\tSAFE-CALL abslabel" which " " int(NextAdrs[curpage] / 0x800) " vs. " curpage " " NR INDIC $0 PCL(); NextAdrs[curpage] += 1; #+ 2 * pageselsize; #won't know until later if pagesel is needed; assume it is for page space allow
#		buf[++buflen] = "\tCALL abslabel" which PCL(); ++NextAdrs[curpage];
#		buf[++buflen] = "\tSAFE-RETURN abslabel" which " " curpage " " NR INDIC $0 PCL(); ++NextAdrs[curpage];
#		buf[++buflen] = "\tWARN \"[CAUTION] check page/bank here";
		return;
	}
	if (match(opc, /B[SC]F gbl_ABSLABEL_(\+D'([0-9]+)')?,([0-7])/, parts)) #set arbitrary target adrs
	{
		++other_fixes["abslabel"];
		which = "abslabel" 8 * ("0" parts[2]) + parts[3];
		buf[++buflen] = which ":" INDIC $0 PCL();
		funcpage[which] = curpage;
		funcadrs[which] = NextAdrs[curpage];
#		buf[++buflen] = "\tWARN \"[CAUTION] check page/bank here";
#		--stats["errors"]; errmsg("abslbl: '" which "' = " buflen);
		labels[which] = buflen; #so unchain can use it
		return;
	}
#	if (opc ~ /^CALL RETURN_[0-9]/)
#	{
#		++other_fixes["return"];
#		buf[++buflen] = "\treturn" INDIC $0 PCL(); ++NextAdrs[curpage];
#		return;
#	}
#	if (opc ~ /^CALL MAIN_[0-9]/)
#	{
#		++other_fixes["goto-main"];
#		buf[++buflen] = "\tgoto main" INDIC $0 PCL(); ++NextAdrs[curpage];
#		return;
#	}
	if ((($1 == "XORLW") || ($1 == "IORLW") || ($1 == "ANDLW") || ($1 == "ADDLW")) && !strtonum($2)) errmsg("near-useless instr: " $0);
	if ($1 == "ORG") #remove addresses and re-assign later
	{
		if (strtonum($2) <= 4) funcpage["abslabel0"] = 0; #keep as-is, just remember which page
		else if (strtonum($2) < 0x2000) { ++other_fixes["discard-org"]; buf[++buflen] = INDIC $0; return; } #preserve only reset/interrupt and config
		else if (strtonum($2) < 0x8000) errmsg("address too high: " $0);
		else if (strtonum($2) < 0x8100) { curpage = 0x8000/4; } #config
		else errmsg("address too high: " $0);
		++stats["org"];
		buf[++buflen] = ((strtonum($2) <= 4)? "abslabel0:\n": "") ((curpage == 0x8000/4)? INDIC: "") $0;
		NextAdrs[curpage] = strtonum($2);
		return;
	}
	if (($1 == "DW") && (curpage == 0x8000/4)) #config
	{
#		buf[++buflen] = "\t__CONFIG " hex(NextAdrs[curpage]) ", " $2 " & 0x3FFF " INDIC $0 PCL(); ++NextAdrs[curpage]; #kludge for MPASM 8.89 - 8.92 .inc file butg
		buf[++buflen] = "\t__CONFIG _CONFIG" (NextAdrs[curpage] - 0x8006) ", " $2 " & 0x3FFF " INDIC $0 PCL(); ++NextAdrs[curpage]; #kludge for MPASM 8.89 - 8.92 .inc file butg
		++stats["config"];
		return;
	}
	if (($1 == "NOP") && (buf[buflen] ~ /[\t ]+(return|RETURN)/)) #remove extraneous nop
	{
		++stats["nop"];
		buf[++buflen] = INDIC $0 PCL();
		return;
	}
#	if ($1 == "END") #inject trailer code
#	{
#		buf[++buflen] = "error 1";
#	}
#	if (opc ~ /DW 0x34[0-9A-Fa-f][0-9A-Fa-f]/) #replace with retlw; not necessary, but easier for debug
#	{
#		++other_fixes["retlw"]; buf[++buflen] = "\tRETLW 0x" substr($2, 5) " " INDIC $0 PCL();
#		++NextAdrs[curpage];
#		return;
#	}
#	if ((opc == "DW 0x0008") && (buf[buflen] !~ /DW 0x/)) #replace with return; not necessary, but easier for debug
#	{
#		++other_fixes["return"]; buf[++buflen] = "\tRETURN " INDIC $0 PCL();
#		++NextAdrs[curpage];
#		return;
#	}
	if ($1 ~ /^(SAFE-)?CALL/) #|| ($1 == "GOTO"))
	{
		destfunc = $2;
#		if (funcpage[destfunc] == "") funcpage[destfunc] = funcpage[funcname] ^ 1; #assume it's NOT this page
		#errmsg("call func " destfunc " on page " funcpage[destfunc] " from " funcname " on page " funcpage[funcname]);
#		if (funcpage[destfunc] != funcpage[funcname]) #this assumes crossing page boundaries is rare
#		{
#			buf[++buflen] = "\tpagesel " destfunc " " INDIC $0;
#			buf[++buflen] = $0;
#			buf[++buflen] = "\tpagesel " funcname " " INDIC $0;
#			return;
#		}
#		buf[++buflen] = gensub(/(CALL|GOTO)/, "SAFE_\\1", 1, $0) " " INDIC $0;
		++other_fixes["safe-call"];
#		if (!(destfunc in funcpage)) { buf[++buflen] = "\tSAFE-CALL " destfunc " " curpage " " NR PCL(); ++NextAdrs[curpage]; } #won't know until later if pagesel is needed; assume it is for page space allow
#		else if (funcpage[destfunc] != curpage) { buf[++buflen] = "\tMOVLP " hex(8 * funcpage[destfunc]); NextAdrs[curpage] += 1 + numbits(8 * funcpage[destfunc]); }
#		buf[++buflen] = $0 PCL(); ++NextAdrs[curpage];
#		if (!(destfunc in funcpage)) { buf[++buflen] = "\tSAFE-RETURN " destfunc " " curpage " " NR PCL(); ++NextAdrs[curpage]; } #won't know until later if pagesel is needed; assume it is for page space allow
#		else if (funcpage[destfunc] != curpage) { buf[++buflen] = "\tMOVLP " hex(8 * curpage) " ;SAFE-CALL " PCL(); NextAdrs[curpage] += 1 + numbits(8 * curpage); }
		buf[++buflen] = Unconditional("\tSAFE-CALL " destfunc " " int(NextAdrs[curpage] / 0x800) " vs. " curpage " " NR PCL()); NextAdrs[curpage] += 1; #+ 2 * pageselsize; #won't know until later if pagesel is needed; assume it is for page space allow
		return;
	}
	if ((opc == "GOTO _startup") || (opc == "GOTO main"))
	{
		++other_fixes["far-goto"];
		destfunc = $2;
#		buf[++buflen] = "\tpagesel " destfunc " " INDIC $0; #always use far-goto
#		++NextAdrs[curpage];
		buf[++buflen] = "\tSAFE-GOTO " $2 " " int(NextAdrs[curpage] / 0x800) " vs. " curpage " " NR INDIC $0 PCL(); NextAdrs[curpage] += 2;
#??		buf[++buflen] = $0 PCL(); ++NextAdrs[curpage];
		buf[++buflen] = ""; #protect goto from org fixup
		return;
	}
	if ($1 == "RETURN")
		for (prev = buflen; prev > buflen - 10; --prev) #look for preceding call
			if (buf[prev] ~ /^[\t ]*;/) continue; #skip commented lines
			else if (match(buf[prev], /^[\t ]+(CALL)[\t ]/, parts))
			{
				++other_fixes["goto-call"];
				buf[prev] = substr(buf[prev], 1, parts[1, "start"] - 1) "GOTO" substr(buf[prev], parts[1, "start"] + 4) INDIC "goto-call";
				buf[++buflen] = INDIC $0 " goto-call";
				return;
			}
			else prev = -1; #anything else between prevents this shortcut
	if ((($1 == "GOTO") || ($1 == "RETURN") || ($1 == "CLRF"))) #&& match(prevstmt(), /^[\t ]+BTFS(S|C) gbl_NEVER,/, parts))
	{
		buf[++buflen] = Unconditional($0 " " INDIC PCL()); ++NextAdrs[curpage];
#TODO: apply this to any stmt, not just goto (needed if "goto $+1" optimized out)
#		++other_fixes[(parts[1] == "C")? "const-always": "const-never"];
#		buf[prev] = INDIC buf[prev] " " ((parts[1] == "C")? " always": " never");
#		if (parts[1] == "S") buf[++buflen] = $0 " " INDIC " !never"; #never skip
#		else { buf[++buflen] = INDIC $0 " !always"; --NextAdrs[curpage]; } #always skip; reclaim btfsc instr space
		return;
	}
#	if (opc == "BTFSC gbl_NEVER,")
#	{
#		++other_fixes["const-always"];
#		else { buf[++buflen] = INDIC $0 " always"; --NextAdrs[curpage]; } #always skip; reclaim btfsc instr space
#	}
	if (opc ~ /CompTempVar[0-9]+ EQU/) ++stats["temps"];
	if (buf[buflen] ~ /gbl_NEVER/) errmsg("unhandled NEVER: " $0 ", prev '" buf[buflen] "'");
#	buf[++buflen] = gensub(/^[\t ]+/, "", 1, $0); #delay output in case following command uses wreg; strip leading white space
	buf[++buflen] = $0 PCL(); #delay output in case following command uses wreg; preserve white space
	++NextAdrs[curpage];
}
function no_flush() {}
function flush()
{
	errmsg("TODO: drop redundant MOVLP 0/8 at gotoc start? (no way to know), bank sel tracking (esp on function entry/exit), reduce/flip btfss/c + goto $+1 + goto/return");
	errmsg("starting pass 2 at T+ " (systime() - starttime) " sec");
#	for (i = 1; i <= buflen; ++i)
#	for (i = 1; i <= buflen/2; ++i) #errors
	limit = buflen; #1623 good; #1622 good; #1624 bad; #1620 good; #1627 bad; #1640 bad; #1615 good; #1570 good; #1665 bad; #1850 bad; #2219 bad; #1480 good; #2958 bad #MPASM gets "stuck"
	errmsg("flushing lines 1.." limit " of " buflen);
#	for (i in funcpage)
#		errmsg("func " i " is at " funcpage[i]);
#	errmsg(buf[1622]);
#	errmsg(buf[1623]);
#	errmsg(buf[1624]);
#	for (i in labels) L = L ", " i;
#	errmsg("labels: " L);
#	for (pass = 1; pass <= 2; ++pass) #2 passes to allow fwd refs to also be handled
		for (i = 1; i <= limit; ++i) #remove trampoline placeholders (was used as prog padding for jar calls or gotos)
			if (buf[i] ~ /^[\t ]+B[CS]F[\t ]gbl_TRAMPOLINE_,/) { buf[i] = INDIC buf[i]; ++other_fixes["trampoline"]; }
		for (i = 1; i <= limit; ++i) #chained goto/return; do this before safe-goto reduction in case page#s changed
			if (match(buf[i], /^[\t ]+SAFE-(GOTO|CALL)[\t ]+([A-Za-z0-9_]+) ([0-9]+) vs. ([0-9]+)/, parts) && (parts[2] !~ /^nop/))
			{
#				if (parts[1] == "CALL") print "next(call[" i "] " buf[i] " = " nextstmt(i);
				if ((parts[1] == "CALL") && (nextstmt(i) ~ /[\t ]+RETURN/)) #convert to goto
				{
					++other_fixes["call-into-goto"];
					buf[i] = gensub(/SAFE-CALL/, "SAFE-GOTO", 1, buf[i]);
					buf[nexti] = INDIC buf[nexti];
					continue;
				}
				destinstr = unchain(parts[2], "(SAFE-)?GOTO", 0);
				if (!destinstr) continue;
				++other_fixes["chained-" tolower(parts[1]) "-pass" pass];
#				--stats["errors"]; errmsg("line " i ": " buf[i] " ==> " destinstr ", my[1] " myparts[1] ", my[2] " myparts[2] ", p[2] " parts[3]);
#				if (!destinstr) continue;
				if (destinstr ~ "RETURN") errmsg("TODO: unchaining empty functions no worky");
				if (match(destinstr, /^[\t ]+SAFE-GOTO[\t ]+([A-Za-z0-9_]+) ([0-9]+) vs. ([0-9]+)/, myparts))
					buf[i] = "\tSAFE-" parts[1] " " myparts[1] " " parts[3] " vs. " parts[4] " " INDIC "chained-1 from " buf[i]; #merge in cur page#
				else buf[i] = destinstr " " INDIC "chained-2 from " buf[i];
			}
	for (i = 1; i <= limit; ++i) #page selects
		if (match(buf[i], /^[\t ]+SAFE-(CALL|GOTO|RETURN)[\t ]+([A-Za-z0-9_]+) ([0-9]+) vs. ([0-9]+)/, parts))
		{
			++other_fixes["page-select"];
			if (!(parts[2] in funcpage)) errmsg("unknown func in '" buf[i] "': " parts[2], parts[4]);
			else
			{
				buf[i] = "\t" parts[1] " " parts[2] " " INDIC buf[i];
				if (funcpage[parts[2]] != parts[3])
				{
#					buf[i] = "\tMOVLP " ((parts[1] == "RETURN")? hex(8 * parts[3]): hex(8 * funcpage[parts[2]])) "\n" buf[i]; #CAUTION: adrs will change by 1 instr
					target = (prevstmt(i - 1) ~ /^[\t ]+(BTFS(S|C)|DECFSZ|INCFSZ)/)? i-1: i;
					buf[target] = "\tMOVLP5 " hex(8 * funcpage[parts[2]]) "\n" buf[target]; #CAUTION: adrs will change by 1 instr
					if (parts[1] == "CALL" || (target != i)) buf[i] = buf[i] "\n\tMOVLP5 " hex(8 * parts[3]); #treat conditional goto as a call that can return
					else errmsg("chained goto " parts[2] " crosses pages: " buf[i]);
				}
			}
		}
	for (i = 1; i <= limit; ++i) #more chained goto/return; do this after safe-goto reduction when case page#s are fixed
		if (match(buf[i], /^[\t ]+(GOTO|CALL)[\t ]+([A-Za-z0-9_]+)/, parts) && (parts[2] !~ /^nop/))
		{
			destinstr = unchain(parts[2], "GOTO", 0);
			if (!destinstr) continue;
			++other_fixes["chained-" tolower(parts[1])];
#			errmsg("line " i ": " buf[i] " ==> " destinstr ", my[1] " myparts[1] ", my[2] " myparts[2] ", p[2] " parts[3]);
			if (match(destinstr, /^[\t ]+GOTO[\t ]+([A-Za-z0-9_]+)/, myparts))
				buf[i] = "\t" parts[1] " " myparts[1] " " INDIC "chained-3 from " buf[i]; #merge in cur page#
			else buf[i] = destinstr " " INDIC "chained-4 from " buf[i];
		}
	for (i = 1; i <= limit; ++i) #reduce incfsz/decfsz
		if ((buf[i] ~ /^[\t ]+BTFSS STATUS,Z/) && match(buf[i - 1], /[\t ]+(DECF|INCF)[\t ]+([A-Za-z0-9_]+(\+D'[0-9]+')?), F/, parts))
		{
#			errmsg("prev: " buf[i - 1] ", match? " (match(buf[i - 1], /[\t ]+(DECF)[\t ]+([A-Za-z0-9_]+(\+D'[0-9]+')?), F/)? "y": "n"));
			++other_fixes["reduce-decfsz"];
			if (buf[i - 1] ~ /WREG/)
				buf[i - 1] = "\tDECFSZ WREG,F " INDIC $0 PCL(); #NOTE: should be +2 for 16F688
			else
				buf[i - 1] = substr(buf[i - 1], 1, parts[1, "start"] + 3) "SZ" substr(buf[i - 1], parts[1, "start"] + 4);
			buf[i] = INDIC buf[i] " inc/decfsz"; #--NextAdrs[curpage]; #prog adrs will change
		}
	for (i = 1; i <= limit; ++i) #swap/move opcodes
		if (match(buf[i], /^[\t ]+SWOPCODE[\t ]+([0-9]+),([0-9]+),([0-9]+)/, parts))
		{
			ofs = 0;
			frominx = toinx = 0;
			buf[i] = INDIC buf[i];
			for (nexti = i + 1; nexti <= limit; ++nexti)
			{
				if ((buf[nexti] !~ /^[\t ]+[A-Za-z_]/) || (buf[nexti] ~ /^[\t ]+SWOPCODE[\t ]/)) continue;
				if (ofs == 1 * parts[1]) frominx = nexti;
				if (ofs == 1 * parts[2]) toinx = nexti;
				++ofs; #ofs relative to SWOPCODE
				if (frominx && toinx) break;
			}
			if (nexti > limit) errmsg("can't find swopcode[" i "] targets: " frominx ", " toinx ", line " buf[i]);
			switch (parts[3])
			{
				case "01": #swap
					svbuf = buf[frominx]; buf[frominx] = buf[toinx]; buf[toinx] = svbuf;
					break;
				case "02": #move
#					if (toinx > frominx) ++toinx; #NOTE: index is off by one due to presence of extra instr prior to move
#					else ++frominx;
#					buf[toinx] = buf[frominx] "\n" buf[toinx]; buf[frominx] = ""; #messes up line#s
					movedir = (toinx > frominx)? +1: -1;
					while (toinx != frominx)
					{
						svline = buf[frominx]; buf[frominx] = buf[frominx + movedir]; buf[frominx + movedir] = svline;
						frominx += movedir;
					}
					break;
				default:
					errmsg("unknown swopcode: " parts[3] " in line [" i "]: " buf[i]);
			}
		}
	for (i = 10; i <= limit; ++i) #condense nop groups of 2 or 4
	{
		numnop = 0;
		for (prev = i; prev > i - 16; --prev) #only look back 16 lines
		{
			if (buf[prev] ~ /^[\t ]+B[SC]F[\t ]+gbl_eecon/) { i += 5; continue; } #don't condense EECON nops (interferes with reads)
			else if (buf[prev] ~ /^[\t ]+NOP[\t ]*;/)
			{
				noplines[numnop++] = prev;
#don't need 4 (near/far call also needs to be compensated for):
#				if (numnop < 4) continue;
#				buf[noplines[3]] = INDIC buf[noplines[3]] " 1 of 4 nop";
#				buf[noplines[2]] = INDIC buf[noplines[2]] " 2 of 4 nop";
#				buf[noplines[1]] = INDIC buf[noplines[1]] " 3 of 4 nop";
#				buf[noplines[0]] = "\tcall nop4 " INDIC buf[noplines[3]] " 4 of 4 nop"; #NOTE: assumes near call
#				++other_fixes["nop4"];
				if (numnop < 2) continue;
				buf[noplines[1]] = INDIC buf[noplines[1]] " 1 of 2 nop";
				buf[noplines[0]] = "\tgoto $+1 " INDIC buf[noplines[1]] " 2 of 2 nop";
				++other_fixes["nop2"];
				for (nexti = prev + 1; nexti < prev + 16; ++nexti) #adjust progpad checks
				{
					if (!match(buf[nexti], /\$(+([0-9]+))? - (abslabel[0-9]+)/, parts)) continue;
					if (!parts[2]) parts[2] = 0;
#					buf[nexti] = gensub(/\$(+([0-9]+))? - (abslabel[0-9]+)/, "($+" (("0" parts[2]) + 1) " - " parts[3] ")", "g", buf[nexti]); #NOTE: all on one buf line
					buf[nexti] = gensub(/\$(+([0-9]+))? - (abslabel[0-9]+) !=/, "$" parts[1] " - " parts[3] " != " parts[2] " - 1 + ", 1, gensub(/expected "#v\(/, "expected \"#v(" parts[2] " - 1 + ", 1, buf[nexti])); #NOTE: all on one buf line
#broken??					buf[nexti] = "#" parts[1, "start"] "#" parts[1, "length"] "#" substr(buf[nexti], 1, parts[1, "start"] - 1) "#\n#" "($+" (parts[2] + 1) " - " parts[3] ")" "#\n#" substr(buf[nexti], parts[1, "start"] + parts[1, "length"]); #NOTE: all on one buf line
					break;
				}
				break;
			}
			else if (buf[prev] ~ /^[\t ]*;/) continue; #skip commented lines
			else break;
		}
	}
	for (i = 1; i <= limit; ++i)
		print buf[i];
#	errmsg("finished pass 2 at T+ " (systime() - starttime) " sec");
	buflen = 0;
}
function leader()
{
	INDIC = ";!";
	PROCINFO["sorted_in"] = "@ind_str_asc"; # sort arrays by key in ascending string order
	starttime = systime();
	print ";\tinclude \"..\\c2asm.inc\" " INDIC " compiled " strftime("%m/%d/%y %H:%M:%S", starttime);
	NextAdrs[curpage = 0] = 0; NextAdrs[1] = 0x800;
	for (i = 0; i < 32; ++i) power2[i] = i? (2 * power2[i - 1]): 1;
#	device = "UNKNOWN";
#	wreg_fixes[""] = other_fixes[""] = stats[""] = 0; #older gawk requires array init before usage?
#	buflen = 0;
	movwisize = 1; #assume MOVWI/MOVIW instr available
	bankselsize = 1; #assume MOVLB instr is available
	pageselsize = 1; #assume MOVLP instr is available
#	decwszsize = 1; #assume DECFSZ, WREG is available
	buf[++buflen] = "\ttitle \"hacked up output from BoostC for Microchip PIC16Fxxx"
	buf[++buflen] = "\tEXPAND ;show macro expansion";
	buf[++buflen] = "\tLIST ;show output";
	buf[++buflen] = "\terrorlevel -302  ;this is a useless/annoying message because the MPASM doesn't handle it well (always generates warning when accessing registers in bank 1, even if you've set the bank select bits correctly)";
	buf[++buflen] = "\terrorlevel -306  ;this is a useless/annoying message because the MPASM doesn't handle it well (always generates warning when accessing page 1, even if you've set the page select bits correctly)";
#	LIST n=60, c=200, t=on, n=0  ;line (page) size, column size, truncate, no paging
#;	LIST R=DEC
#	LIST mm=on  ;memory map
#;	LIST st=on  ;symbol table
	buf[++buflen] = "#define WARN  messg"; #use #def to preserve source line#
	buf[++buflen] = "#define ERROR  messg"; #allow compile to continue (so we get results); use #def to preserve source line#
	mapfile = CWD "RenRGB_main.map"; #from C compiler; NOTE: must use a var in getline; can't use str concat
	while ((getline < mapfile) > 0)
		if (match($1, /^[0-9A-Fa-f]+:([0-9A-Fa-f]+)$/, parts)) funclen[$2] = parts[1]; #adrs:len; adrs will be overwritten and len is slightly larger than it will be, but close enough
		else if ($0 ~ /Register usage/) break;
	close(mapfile);
}
function trailer()
{
#	errmsg("here3");
	flush();
	PROCINFO["sorted_in"] = "@ind_str_asc"; #sort arrays asc by index
	print ";eof, " NR " src lines";
	for (i in wreg_fixes)
		print ";#wreg " i ": " wreg_fixes[i];
	for (i in other_fixes)
		print ";#" i ": " other_fixes[i];
	for (i in stats)
		print ";#" i ": " stats[i];
	print "function\t\taddress\tlen\tpage" > CWD "c2asm.map";
	for (i in funcadrs)
		funcinx[i] = sprintf("%.8x", strtonum(funcadrs[i])) ":" i;
	numfunc = asort(funcinx, funcsort);
	for (i = 1; i <= numfunc; ++i)
	{
		ii = rightof(funcsort[i], ":");
		if ((i > 1) && (funcpage[rightof(funcsort[i - 1], ":")] != funcpage[ii])) print "------------------";
		print ii "\t" hex(funcadrs[ii]) "\t" funclen[ii] "\t" funcpage[ii] >> CWD "c2asm.map";
	}
	print "-end-" >> CWD "c2asm.map";
}
#follow "goto" chain to bottom (recursive):
function unchain(lbl, type, nested)
{
#	errmsg("labels[" lbl "] = " labels[lbl] " == " buf[labels[lbl]]);
#	if (!(lbl in labels)) errmsg("unchain unknown label: '" lbl "'");
	if (nested > 10) { errmsg("unchain " lbl ": too many nested levels"); return ""; }
	for (j = labels[lbl]; j < labels[lbl] + 5; ++j) #check if label has a goto/return
	{
#		if (lbl == "abslabel14") { --stats["errors"]; errmsg("absl14: checking [" j "]: " buf[j]); }
		if (buf[j] ~ /^;/) continue; #skip comments
		if (buf[j] ~ /^[A-Za-z0-9_]([\t ]*\:[\t ]*)?/) continue; #skip label
		if (buf[j] ~ /^[\t ]+RETURN/) { myparts[1] = ""; return buf[j]; }
		if (!match(buf[j], "^[\\t ]+" type "[\\t ]+([A-Za-z0-9_]+)", myparts)) break;
		retval = buf[j]; #preserve during recursion
		if (unch = unchain(myparts[1], type, nested + 1)) retval = unch;
		return retval;
	}
	return "";
}
#device-specific stuff:
function device(which)
{
	errmsg("DEVICE: " which);
	if (which == "16F688")
	{
		bankselsize = 2; #MOVLB instr is not available
		buf[++buflen] = "#define EEADRL  EEADR";
		buf[++buflen] = "MOVLP MACRO pg; set entire pclath; leaves WREG intact (req'd for gotoc via wreg)";
		buf[++buflen] = 	"\tif (pg != 15)\n\t\tclrf PCLATH\n\tendif"; #clear all bits then turn some back on as needed
		buf[++buflen] = 	"\tif (pg & 1)\n\t\tbsf PCLATH, 0\n\tendif";
		buf[++buflen] = 	"\tif (pg & 2)\n\t\tbsf PCLATH, 1\n\tendif";
		buf[++buflen] = 	"\tif (pg & 4)\n\t\tbsf PCLATH, 2\n\tendif";
		buf[++buflen] = 	"\tif (pg & 8)\n\t\tbsf PCLATH, 3\n\tendif";
		buf[++buflen] =		"\tENDM";
		buf[++buflen] = "MOVLP5 MACRO pg; only set pclath & 0x08; used for call/goto";
		buf[++buflen] = 	"\tif (pg & 8)\n\t\tbsf PCLATH, 3\n\telse\n\t\tbcf PCLATH, 3\n\tendif";
		buf[++buflen] =		"\tENDM";
		movwisize = 2; #MOVWI/MOVIW instr not available
		buf[++buflen] = "#define INDF0  INDF\n#define FSR0  FSR";
#		buf[++buflen] = "VARIABLE FSR0 = 0, FSR1 = 0"; #used to detect inc/dec
#		buf[++buflen] = "MOVWI MACRO fsr_auto";
#		buf[++buflen] = "    "\tLOCAL SVFSR0 = FSR0, SVFSR1 = FSR1\n\tfsr_auto
#			case "MOVWF PREINC": fsrmode = "MOVWI ++FSR#"; break;
#			case "MOVWF PREDEC": fsrmode = "MOVWI --FSR#"; break;

		pageselsize = 2; #MOVLP instr is not available; assume at least 2 instr (could be 1 - 4)
#		buf[++buflen] = "DECWSZ MACRO"; #NOTE: takes 3 instr instead of 2
#		buf[++buflen] = 	"\tADDLW 0xFF\n\tBTFSS STATUS,Z";
#		buf[++buflen] =		"\tENDM";
#		decwszsize = 2; #DECFSZ, WREG is not available
	}
	else
	{
		buf[++buflen] = "#define MOVLP5  MOVLP";
#		buf[++buflen] = "DECWSZ MACRO";
#		buf[++buflen] = 	"\tDECFSZ WREG,F"; #can use WREG for this (extended instr set is orthogonal)
#		buf[++buflen] =		"\tENDM";
	}
}
function numbits(val)
{
	return (and(val, 1)? 1: 0) + (and(val, 2)? 1: 0) + (and(val, 4)? 1: 0) + (and(val, 8)? 1: 0) + (and(val, 16)? 1: 0) + (and(val, 32)? 1: 0) + (and(val, 64)? 1: 0) + (and(val, 128)? 1: 0);
}
#show current PCL (mainly for debug):
function PCL()
{
	return " ;PCL=" curpage ":" hex(NextAdrs[curpage]);
}
function Unconditional(stmt)
{
	if (match(prevstmt(), /^[\t ]+BTFS(S|C) gbl_NEVER,/, parts))
	{
		++other_fixes[(parts[1] == "C")? "const-always": "const-never"];
		buf[prev] = INDIC buf[prev] " " ((parts[1] == "C")? " always": " never");
		if (parts[1] == "C") { NextAdrs[curpage] -= 2; return INDIC stmt " !always"; } #always skip; reclaim space
		--NextAdrs[curpage]; #partial reclaim
	}
	return stmt;
}
#find previous non-empty stmt:
function prevstmt(bufi)
{
	if (!bufi) bufi = buflen;
	for (prev = bufi; prev > bufi - 10; --prev) #only look back 10 lines
	{
		if (buf[prev] ~ /^[\t ]*;/) continue; #skip commented lines
		if (buf[prev] ~ /^[A-Za-z0-9_]/) continue; #skip labels
		return buf[prev];
	}
#	errmsg("no prev[" buflen "]");
	return "";
}
function nextstmt(cur)
{
	for (nexti = cur + 1; nexti < cur + 10; ++nexti) #only look ahead 10 lines
	{
		if (buf[nexti] ~ /^[\t ]*;/) continue; #skip commented lines
		if (buf[nexti] ~ /^[A-Za-z0-9_]/) continue; #skip labels
		return buf[nexti];
	}
#	errmsg("no next[" buflen "]");
	return "";
}
#function strtonum(str) #missing in gawk < 3.1.6
#{
##	return sprintf("%d", str); #kludge: force str to be treated as number; also doesn't work
#	if (substr(str, 1, 2) == "0x") radix = "0123456789abcdef";
##	else if (substr(str, 1, 2) ==
#	else { errmsg("unknown radix: " str); return 0; }
#	val = 0;
#	for (i = 3; i <= length(str); ++i)
#		if (digit = index(radix, tolower(substr(str, i, 1)))) val = val * length(radix) + digit - 1;
#		else { errmsg("bad digit[" (i - 2) "]: " str); return 0; }
#	return val;
#}
function rightof(str, delim)
{
	return substr(str, index(str, delim) + length(delim));
}
function upper_byte(val) # & missing in gawk?
{
	return int(val / 256) * 256;
}
function hex(val)
{
	return sprintf("0x%x", val);
}
function hex4(val)
{
	return sprintf("0x%.4x", val);
}
#function match3(str, regex, ary) #seems to be broken or variant missing in gawk < 3.1.6
#{
#	errmsg("match[1]: '" str "', '" regex "' => '" gensub(regex, "\\1", str) "'");
#	ary[1] = gensub(regex, "\\1", str);
#	ary[2] = gensub(regex, "\\2", str);
#	ary[3] = gensub(regex, "\\3", str);
#	ary[4] = gensub(regex, "\\4", str);
#	return ary[1] ary[2] ary[3] ary[4] != "";
#}
function errmsg(msg, srcline)
{
	if (!srcline) srcline = NR;
	print msg " @" srcline > "/dev/stderr";
	if (++stats["errors"] > 20) quit();
}
function debug(msg, srcline)
{
	if (!srcline) srcline = NR;
	print msg " @" srcline > "/dev/stderr";
}
