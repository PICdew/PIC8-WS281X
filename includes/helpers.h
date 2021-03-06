////////////////////////////////////////////////////////////////////////////////
////
/// Compile time helpers, macros, misc defs (compiler-independent)
//

#ifndef _HELPERS_H
#define _HELPERS_H

#define FALSE  0
#define TRUE  1 //(-1) ;"-1" is safer, but "1" avoids loss-of-precision warnings when assigning to a bit var
#define MAYBE  2  //;not FALSE and not TRUE; used for tri-state logic
#define DONT_CARE  FALSE  //;arbitrary, but it's generally safer to turn off a don't-care feature than to leave it on


//stringize for text strings and #pragma messages:
//https://stackoverflow.com/questions/1562074/how-do-i-show-the-value-of-a-define-at-compile-time
#define TOSTR(x)  TOSTR_INNER(x)
#define TOSTR_INNER(x)  #x

//#define CONCAT(lhs, rhs) CONCAT_INNER(lhs, rhs)
//#define CONCAT_INNER(lhs, rhs) lhs##rhs
#define CONCAT(...)  ALLOW_4ARGS(__VA_ARGS__, CONCAT_4ARGS, CONCAT_3ARGS, CONCAT_2ARGS, CONCAT_1ARG) (__VA_ARGS__)
#define CONCAT_1ARG(str1)  str1
#define CONCAT_2ARGS(str1, str2)  str1 ## str2
#define CONCAT_3ARGS(str1, str2, str3)  str1 ## str2 ## str3
#define CONCAT_4ARGS(str1, str2, str3, str4)  str1 ## str2 ## str3 ## str4


#define reset(device, ...)  CONCAT(device, _reset(__VA_ARGS__)) //device##_reset(__VA_ARGS__)


////////////////////////////////////////////////////////////////////////////////
////
/// Color codes
//

//ANSI color codes (for console output):
//https://en.wikipedia.org/wiki/ANSI_escape_code
#define ANSI_COLOR(code)  "\x1b[" code "m"
#define RED_MSG  ANSI_COLOR("1;31") //too dark: "0;31"
#define GREEN_MSG  ANSI_COLOR("1;32")
#define YELLOW_MSG  ANSI_COLOR("1;33")
#define BLUE_MSG  ANSI_COLOR("1;34")
#define PINK_MSG  ANSI_COLOR("1;35")
#define CYAN_MSG  ANSI_COLOR("1;36")
#define GRAY_MSG  ANSI_COLOR("0;37")
#define ENDCOLOR  ANSI_COLOR("0")

//#define RED_MSG(msg)  RED_LT msg ENDCOLOR
//#define GREEN_MSG(msg)  GREEN_LT msg ENDCOLOR
//#define YELLOW_MSG(msg)  YELLOW_LT msg ENDCOLOR
//#define BLUE_MSG(msg)  BLUE_LT msg ENDCOLOR
//#define PINK_MSG(msg)  PINK_LT msg ENDCOLOR
//#define CYAN_MSG(msg)  CYAN_LT msg ENDCOLOR
//#define GRAY_MSG(msg)  GRAY_LT msg ENDCOLOR


////////////////////////////////////////////////////////////////////////////////
////
/// Compile-time conditionals (shouldn't generate any run-time logic if used with constants)
//

//in-line IF:
//BoostC compiler (and maybe others) doesn't handle "?:" tenary operator at compile time, even with constants (it should).
//This macro gives equivalent functionality, but results in a constant expression that can be reduced at compile time.
//This generates *a lot* more efficent code, especially for * / % operators.
//CAUTION: when used with #defines these macros may generate long statements that could overflow preprocessors's macro body limit.
//#define IIF(tfval, tval, fval)  //((((tfval)!=0)*(tval)) + (((tfval)==0)*(fval))) //this one repeats tfval so there could be side effects ot macro body could get too long
#define IIF(tfval, tval, fval)  (((tfval)!=0) * ((tval)-(fval)) + (fval)) //this one assumes fval is short and tries to minimize macro body size and side effects by expaning tfval only once
//#define IIF0(tfval, tval, dummy)  (((tfval)!=0)*(tval))  //;shorter version if fval == 0; helps avoid macro body length errors
#define IIFNZ(expr, tval)  (((expr)!=0)*(tval))  //;shorter version if fval == 0; helps avoid macro body length errors
#if ((3 == 3) != 1) || ((3 == 4) != 0)  //paranoid check; IIF relies on this behavior
 #error RED_MSG "IIF broken: TRUE != 1 or FALSE != 0"
#endif


//repeat a stmt in-line:
//cuts down on source code verbosity.
//intended only for short stmts and low repeat counts
#if 0
//generates "unreachable code" warnings
#define REPEAT(count, stmt)  \
{ \
	if (count > 0) stmt; \
	if (count > 1) stmt; \
	if (count > 2) stmt; \
	if (count > 3) stmt; \
	if (count > 4) stmt; \
	if (count > 5) stmt; \
	if (count > 6) stmt; \
	if (count > 7) stmt; \
	if (count > 8) stmt; \
	if (count > 9) stmt; \
	if (count > 10) stmt; \
	if (count > 11) stmt; \
	if (count > 12) stmt; \
	if (count > 13) stmt; \
	if (count > 14) stmt; \
	if (count > 15) stmt; \
}
#else
#define REPEAT(count, stmt)  REPEAT_##count(stmt)
#define REPEAT_0(stmt)  //noop
#define REPEAT_1(stmt)  { stmt; REPEAT_0(stmt); }
#define REPEAT_2(stmt)  { stmt; REPEAT_1(stmt); }
#define REPEAT_3(stmt)  { stmt; REPEAT_2(stmt); }
#define REPEAT_4(stmt)  { stmt; REPEAT_3(stmt); }
#define REPEAT_5(stmt)  { stmt; REPEAT_4(stmt); }
#define REPEAT_6(stmt)  { stmt; REPEAT_5(stmt); }
#define REPEAT_7(stmt)  { stmt; REPEAT_6(stmt); }
#define REPEAT_8(stmt)  { stmt; REPEAT_7(stmt); }
#define REPEAT_9(stmt)  { stmt; REPEAT_8(stmt); }
#define REPEAT_10(stmt)  { stmt; REPEAT_9(stmt); }
#define REPEAT_11(stmt)  { stmt; REPEAT_10(stmt); }
#define REPEAT_12(stmt)  { stmt; REPEAT_11(stmt); }
#define REPEAT_13(stmt)  { stmt; REPEAT_12(stmt); }
#define REPEAT_14(stmt)  { stmt; REPEAT_13(stmt); }
#define REPEAT_15(stmt)  { stmt; REPEAT_14(stmt); }
#define REPEAT_16(stmt)  { stmt; REPEAT_15(stmt); }
#endif


#define NOP(n)  REPEAT(n, nop())

#define RETURN  { if (ALWAYS) return; } //avoid "unreachable code" warnings

//handle optional macro params:
//see https://stackoverflow.com/questions/3046889/optional-parameters-with-c-macros?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
//for stds way to do it without ##: https://stackoverflow.com/questions/5588855/standard-alternative-to-gccs-va-args-trick?noredirect=1&lq=1
#define ALLOW_1ARG(one, two, ...)  two
#define ALLOW_2ARGS(one, two, three, ...)  three
#define ALLOW_3ARGS(one, two, three, four, ...)  four
#define ALLOW_4ARGS(one, two, three, four, five, ...)  five
#define ALLOW_5ARGS(one, two, three, four, five, six, ...)  six
#define ALLOW_6ARGS(one, two, three, four, five, six, seven, ...)  seven
#define ALLOW_7ARGS(one, two, three, four, five, six, seven, eight, ...)  eight
#define ALLOW_8ARGS(one, two, three, four, five, six, seven, eight, nine, ...)  nine
#define ALLOW_9ARGS(one, two, three, four, five, six, seven, eight, nine, ten, ...)  ten
#define ALLOW_10ARGS(one, two, three, four, five, six, seven, eight, nine, ten, eleven, ...)  eleven
//etc.


////////////////////////////////////////////////////////////////////////////////
////
/// Arithemtic functions, data helpers, etc
//

//;misc arithmetic helpers:
#define non0(val)  IIF(val, val, 1) //(IIFNZ(val, (val)-1) + 1) //avoid divide-by-0 errors
#define rdiv(num, den)  (((num) + (den) / 2) / non0(den))  //;rounded divide
#define divup(num, den)  (((num) + (den) - 1) / non0(den))  //;round-up divide
#define SIZE(thing)  (sizeof(thing) / sizeof((thing)[0]))  //#entries in an array

//kludge: compensate for SDCC preprocessor sign extend
#define U16FIXUP(val)  ((val) & 0xFFFF)

//these are upper case to avoid expansion within text:
//IIF is used so constants can be reduced at compile time.
#define SGN(x)  IIF((x) < 0, -1, (x) != 0)  //;-1/0/+1
#define ABS(x)  IIF((x) < 0, 0-(x), x)  //;absolute value
#define MIN(x, y)  IIF((x) < (y), x, y)
#define MAX(x, y)  IIF((x) > (y), x, y)
//#define MIN(x, y)  ((x) + IIF0((y) < (x), (y) - (x), 0)) //;uses IIF0 to try to avoid macro body length problems
//#define MAX(x, y)  ((x) + IIF0((y) > (x), (y) - (x), 0)) //;uses IIF0 to try to avoid macro body length problems


/////////////////////////////////////////////////////////////////////////////////
////
/// Bit manipulation helpers:
//

//convert bit mask to bit#:
//use token-pasting to reduce macro body size after expansion (needed for MPASM usage)
//CAUTION: sensitive to value format; must match exactly
#define bit2inx(val)  bit2inx_inner(val) //kludge: need nested macro to force eval
#define bit2inx_inner(val)  BITNUM_##val
#define BITNUM_0x80  7
#define BITNUM_0x40  6
#define BITNUM_0x20  5
#define BITNUM_0x10  4
#define BITNUM_0x08  3
#define BITNUM_0x04  2
#define BITNUM_0x02  1
#define BITNUM_0x01  0


//log2:
//;powers of 2 (up to 16):
//Equivalent to Log2(value) + 1 when only 1 bit of value is set
//BoostC compiler doesn't handle "?:" operator at compile time, even with constants (it should).
//This macro allows a constant expression to be generated at compile time.
//#ifdef __CC5X__
// #warning YELLOW_MSG "CC5XBUG: multi-line macros not handled in #if"
//#endif
//	IIF((val)>>8, 99, 0) /*return bad value if out of range*/ + 
#define NumBits8(val)  \
( \
	((val) >= 0x80) + \
	((val) >= 0x40) + \
	((val) >= 0x20) + \
	((val) >= 0x10) + \
	((val) >= 0x08) + \
	((val) >= 0x04) + \
	((val) >= 0x02) + \
	((val) >= 0x01) + \
0)

//	IIF((val)>>16, 99, 0) /*return bad value if out of range*/ + 
#define NumBits16(val)  \
( \
	((val) >= 0x8000) + \
	((val) >= 0x4000) + \
	((val) >= 0x2000) + \
	((val) >= 0x1000) + \
	((val) >= 0x0800) + \
	((val) >= 0x0400) + \
	((val) >= 0x0200) + \
	((val) >= 0x0100) + \
NumBits8(val))


//convert hex nibble to ASCII char:
#define hexchar(val)  { WREG = val; hexchar_WREG(); }
INLINE void hexchar_WREG()
{
	andlw(0x0F); //bad code: WREG &= 0x0F;
	addlw(-10); //bad code: WREG -= 10;
	if (BORROW) addlw(10 + '0' - 'A'); //bad code: WREG +=
	addlw('A'); //bad code: WREG += 'A';
}


//convert bit# to pin mask:
//takes 7 instr always, compared to a variable shift which would take 2 * #shift positions == 2 - 14 instr (not counting conditional branching)
//#if 1
#define bit2mask_WREG(bitnum)  \
{ \
	WREG = 0x01; \
	if (bitnum & 0b010) WREG = 0x04; \
	if (bitnum & 0b001) WREG += WREG; \
	if (bitnum & 0b100) swap(WREG); \
}

#ifdef COMPILER_DEBUG //debug
 #ifndef debug
  #define debug() //define debug chain
 #endif
//define globals to shorten symbol names (local vars use function name as prefix):
    volatile AT_NONBANKED(0) uint8_t bitmask0, bitmask1, bitmask2, bitmask3, bitmask4, bitmask5, bitmask6, bitmask7;
 INLINE void bitmask_debug(void)
 {
    debug(); //incl prev debug info
    bit2mask_WREG(0); bitmask0 = WREG; //should be 0x01
    bit2mask_WREG(1); bitmask1 = WREG; //0x02
    bit2mask_WREG(2); bitmask2 = WREG; //0x04
    bit2mask_WREG(3); bitmask3 = WREG; //0x08
    bit2mask_WREG(4); bitmask4 = WREG; //0x10
    bit2mask_WREG(5); bitmask5 = WREG; //0x20
    bit2mask_WREG(6); bitmask6 = WREG; //0x40
    bit2mask_WREG(7); bitmask7 = WREG; //0x80
 }
 #undef debug
 #define debug()  bitmask_debug()
#endif

//#else
//simpler logic, but vulnerable to code alignment:
//this takes at least as long as alternate above
//non_inline void bit2mask_WREG(void)
//{
//	volatile uint8 entnum @adrsof(LEAF_PROC);
//	ONPAGE(PROTOCOL_PAGE); //put on same page as protocol handler to reduce page selects

//return bit mask in WREG:
//	INGOTOC(TRUE); //#warning "CAUTION: pclath<2:0> must be correct here"
//	pcl += WREG & 7;
//	PROGPAD(0); //jump table base address
//	JMPTBL16(0) RETLW(0x80); //pin A4
//	JMPTBL16(1) RETLW(0x40); //A2
//	JMPTBL16(2) RETLW(0x20); //A1
//	JMPTBL16(3) RETLW(0x10); //A0
//	JMPTBL16(4) RETLW(0x08); //C3
//	JMPTBL16(5) RETLW(0x04); //C2
//	JMPTBL16(6) RETLW(0x02); //C1
//	JMPTBL16(7) RETLW(0x01); //C0
//	INGOTOC(FALSE); //check jump table doesn't span pages
#if 0 //in-line minimum would still take 7 instr:
	WREG = 0x01;
	if (reg & 2) WREG = 0x04;
	if (reg & 1) WREG += WREG;
	if (reg & 4) swap(WREG);
#endif
//#ifdef PIC16X
//	TRAMPOLINE(1); //kludge: compensate for address tracking bug
//#endif
//}
//#endif


/////////////////////////////////////////////////////////////////////////////////
////
/// Helpers for generic Port/Pin handling:
//

//;Helpers to allow more generic port and I/O pin handling.
//include port# with pin# for more generic code:
//;port/pin definitions:
//;These macros allow I/O pins to be refered to using 2 hex digits.
//;First digit = port#, second digit = pin#.  For example, 0xB3 = Port B, pin 3 (ie, RB3).
//;For example, 0xA0 = Port A pin 0, 0xC7 = Port C pin 7, etc.
//#define PORTOF(portpin)  nibbleof(portpin, 1)
#define PORTOF(portpin)  ((portpin) & 0xF0)
//#define PINOF(portpin)  nibbleof(portpin, 0)
#define PINOF(portpin)  ((portpin) & 0x0F)
//too complex:#define PORTPIN(port, pin)  (IIF((port) & 0xF, (port) << 4, port) | ((pin) & 0xF)) //allow port# in either nibble
#define PORTPIN(port, pin)  (PORTOF(((port) << 4) | (port)) | PINOF(pin)) //allow port# in either nibble


#ifdef _PORTA
 #define isPORTA(portpin)  (PORTOF(portpin) == _PORTA)
 #define LATA0_ADDR  LATA_ADDR
 #define LATA1_ADDR  LATA_ADDR
 #define LATA2_ADDR  LATA_ADDR
 #define LATA3_ADDR  LATA_ADDR
 #define LATA4_ADDR  LATA_ADDR
 #define LATA5_ADDR  LATA_ADDR
 #define LATA6_ADDR  LATA_ADDR
 #define LATA7_ADDR  LATA_ADDR
#else
 #define isPORTA(ignored)  FALSE
#endif
#ifdef _PORTB
 #define isPORTB(portpin)  (PORTOF(portpin) == _PORTB)
 #define isPORTBC  isPORTB
 #define LATB0_ADDR  LATB_ADDR
 #define LATB1_ADDR  LATB_ADDR
 #define LATB2_ADDR  LATB_ADDR
 #define LATB3_ADDR  LATB_ADDR
 #define LATB4_ADDR  LATB_ADDR
 #define LATB5_ADDR  LATB_ADDR
 #define LATB6_ADDR  LATB_ADDR
 #define LATB7_ADDR  LATB_ADDR
#else
 #define isPORTB(ignored)  FALSE
#endif
#ifdef _PORTC
 #define isPORTC(portpin)  (PORTOF(portpin) == _PORTC)
 #define isPORTBC  isPORTC
 #define LATC0_ADDR  LATC_ADDR
 #define LATC1_ADDR  LATC_ADDR
 #define LATC2_ADDR  LATC_ADDR
 #define LATC3_ADDR  LATC_ADDR
 #define LATC4_ADDR  LATC_ADDR
 #define LATC5_ADDR  LATC_ADDR
 #define LATC6_ADDR  LATC_ADDR
 #define LATC7_ADDR  LATC_ADDR
#else
 #define isPORTC(ignored)  FALSE
#endif
#ifndef isPORTBC
 #define isPORTBC(ignored)  FALSE
#endif


#define PORTAPIN(portpin)  IIFNZ(isPORTA(portpin), PINOF(portpin))
#define PORTBPIN(portpin)  IIFNZ(isPORTB(portpin), PINOF(portpin))
#define PORTCPIN(portpin)  IIFNZ(isPORTC(portpin), PINOF(portpin))
#define PORTBCPIN(portpin)  IIFNZ(isPORTBC(portpin), PINOF(portpin))

//CAUTION: use "UL" to preserve bits/avoid warning when combining into 16-bit values
#define PORTAMASK(portpin)  IIFNZ(isPORTA(portpin), 1UL << PINOF(portpin))
#define PORTBMASK(portpin)  IIFNZ(isPORTB(portpin), 1UL << PINOF(portpin))
#define PORTCMASK(portpin)  IIFNZ(isPORTC(portpin), 1UL << PINOF(portpin))
#define PORTBCMASK(portpin)  IIFNZ(isPORTBC(portpin), 1UL << PINOF(portpin))
#define PINMASK(portpin)  (1 << PINOF(portpin))


//encode port A and port B/C into one 16-bit value to allow subsequent split and generic port logic:
//port A in upper byte, port B/C in lower byte
//didn't help- CAUTION: use "L" to preserve bits/avoid warning
//#define pin2bits16(pin)  ABC2bits(IIFNZ(isPORTA(pin), 1 << PINOF(pin)), IIFNZ(isPORTBC(pin), 1 << PINOF(pin)))
#define PORTMAP16(portpin)  ((PORTAMASK(portpin) << 8) | PORTBCMASK(portpin))
//#define ABC2bits16(Abits, BCbits)  ((Abits) << 8) | ((Bbits) & 0xff))
#define Abits(bits16)  ((bits16) >> 8) //& PORTA_MASK
#define BCbits(bits16)  ((bits16) & 0xff) //& PORTBC_MASK


//allow PORT and TRIS to be indexed by port#:
//volatile __at(PORTA_ADDR - 0xA) uint8_t PORT[0xF - 0xA + 1]; //A - F (subject to device)
//volatile __at(TRISA_ADDR - 0xA) uint8_t TRIS[0xF - 0xA + 1];
//#define TRISOF(_pin)  IIF(isPORTA(_pin), TRISA, TRISBC)

//select TRIS and PORT bit symbolically:
//this allows one const to be used for both TRIS and PORT bit vars
//#define TRISOF(_pin)  IIF(isPORTA(_pin), TRISA, TRISBC)
#define PORTx(pin)  CONCAT(R, pin) //PORTx_inner(pin)
//#define PORTx_inner(pin)  R##pin //NOTE: inconsistent name
#define PORTxBIT(pin)  CONCAT(_R, pin)
#define PORTxADDR(pin)  CONCAT(PORT, pin, _ADDR)

#define TRISx(pin)  CONCAT(TRIS, pin) //TRISx_inner(pin)
//#define TRISx_inner(pin)  TRIS##pin
#define TRISxBIT(pin)  CONCAT(_TRIS, pin) //_##TRISx(pin)
#define TRISxADDR(pin)  CONCAT(TRIS, pin, _ADDR)

#define LATx(pin)  CONCAT(LAT, pin) //LATx_inner(pin)
//#define LATx_inner(pin)  LAT##pin
#define LATxBIT(pin)  CONCAT(_LAT, pin) //_##LATx(pin)
#define LATxADDR(pin)  CONCAT(LAT, pin, _ADDR)

#endif //ndef _HELPERS_H
//EOF