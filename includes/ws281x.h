////////////////////////////////////////////////////////////////////////////////
////
/// WS281X handlers
//

#ifndef WS281X_H
#define WS281X_H

#include "clock.h"


#if 0 //from RenXt
//WS2811 with 5 MIPS PIC:
//WS2812: "0" = usec high (0.2 - 0.5) + usec low (0.65 - 0.95), "1" = usec high (0.55 - 0.85) + usec low (0.45 - 0.75)
//high speed WS2811: "0" = 0.25 usec high (0.18 - 0.32) + 1.0 usec low (0.93 - 1.07), "1" = 0.6 usec high (0.53 - 0.67) + 0.65 usec low (0.58 - 0.72), >= 25 usec reset
//16F688 @20 MHz (5 MIPS): 200 nsec/instr, "0" = 1 instr high + 5 instr low, "1" = 3 instr high + 3 instr low => 1/2/3 instr bit cycle; TIMING WITHIN SPEC
//16F688 @18.432 MHz (4.6 MIPS): 217 nsec/instr, "0" = 1 instr high + 5 instr low (1.085 vs. 1.07 usec), "1" = 3 instr high + 3 instr low; MARGINAL TIMING (1.4% off, probably okay)
//16F688 @16 MHz (4 MIPS): 250 nsec/instr, "0" = 1 instr high + 4 instr low, "1" = 2.2 - 2.6 instr high + 2.4 - 2.8 instr low; BAD TIMING
//total bit cycle time @20 MHz: 6 instr * 200 nsec = 1.2 usec => 28.8 usec/node (24 bits)
//total bit cycle time @18.432 MHz: 6 instr * 217 nsec ~= 1.3 usec => 31.25 usec/node (24 bits)
#define SEND_SERIES_BIT_WS2811_5MIPS(val, varbit, spare3or4)  \
{ \
/*	1!	2?	3	4!	5	6	1!	etc.*/ \
	portX.SERPIN = 1; /*bit start*/ \
		/*2 spare instr MIGHT be moved to here from below; for variable bit, FIRST instr must alter portX*/ \
				if (val) SWOPCODE(0, 2); /*"1" bit transition occurs later*/ \
				portX.SERPIN = 0; /*"0" bit transition occurs earlier*/ \
		/*if ((val) && ((val) != ~0))*/ varbit; /*NOTE: for variable bits, first instr must alter portX*/ \
			spare3or4; /*3 spare instr (4 for const bit, counting varbit above)*/ \
}


//WS2811 with 8 MIPS PIC:
//high speed WS2811: "0" = 0.25 usec high (0.18 - 0.32) + 1.0 usec low (0.93 - 1.07), "1" = 0.6 usec high (0.53 - 0.67) + 0.65 usec low (0.58 - 0.72), >= 25 usec reset
//16F182X @32 MHz (8 MIPS): 125 nsec/instr, "0" = 2 instr high + 8 instr low, "1" = 5 instr high + 5 instr low => 2/3/5 instr bit cycle; TIMING WITHIN SPEC
//total bit cycle time: 10 instr * 125 nsec = 1.25 usec => 30 usec/node (24 bits)
#define SEND_SERIES_BIT_WS2811_8MIPS(val, varbit, spare7or8)  \
{ \
/*	1!	2	3?	4	5	6!	7	8	9	10	1!	etc.*/ \
	portX.SERPIN = 1; /*bit start*/ \
		/*4 spare instr MIGHT be moved to here from below; for variable bit, SECOND instr must alter portX*/ \
						SWOPCODE(0, IIF(val, 4, 1)); /*"1" bit transition occurs later*/ \
						portX.SERPIN = 0; /*"0" bit transition occurs earlier*/ \
			if ((val) && ((val) != ~0)) SWOPCODE(0, 1); /*variable bit transition occurs later*/ \
			/*if ((val) && ((val) != ~0))*/ varbit; /*NOTE: for variable bits, first instr must alter portX*/ \
				spare7or8; /*7 spare instr (8 for const bit, counting varbit above); CAUTION: portX.SERPIN = 0 might be inserted mid way*/ \
}
#endif


//WS2811 with 8 MIPS PIC:
//high speed WS2811: "0" = 0.25 usec high (0.18 - 0.32) + 1.0 usec low (0.93 - 1.07), "1" = 0.6 usec high (0.53 - 0.67) + 0.65 usec low (0.58 - 0.72), >= 25 usec reset
//16F182X @32 MHz (8 MIPS): 125 nsec/instr, "0" = 2 instr high + 8 instr low, "1" = 5 instr high + 5 instr low => 2/3/5 instr bit cycle; TIMING WITHIN SPEC
//total bit cycle time: 10 instr * 125 nsec = 1.25 usec => 30 usec/node (24 bits)
//TODO: retrofit 5 MIPS code?
#if CLOCK_FREQ != 32 MHz
 #error "[ERROR] this code assumes 8 MIPS (30 MHz clock)"
#endif


//send out next WS281X bit:
//10 instr @8 MIPS = 1.25 usec (24 bits/node == 30 usec == 800 KHz)
//2/3/5 instr @8 MIPS conforms to WS281X timing spec
//40% CPU utilization; 6 spare instr per bit can be used for other processing
//NOTE: for correct timing: val must be reg bit, BANKSELECT must be done already
#define outWSbit(...)  USE_ARG4(__VA_ARGS__, outWSbit_3ARGS, outWSbit_2ARGS, outWSbit_1ARG) (__VA_ARGS__)
#define outWSbit_2ARGS(pin, val)  outWSbit_3ARGS(pin, val, { nop2(); nop4(); }) //pad spare instr
#define outWSbit_3ARGS(pin, val, spare_6instr)  \
{ \
	PROGPAD(0); \
    pin = 1; /*start bit; 1 instr*/ \
    if (!(val)) pin = 0; /*2 instr; pin changes on second instr*/ \
    SWOPCODE(0, 2); /*relocates following instr down by 2*/ \
    pin = 0; /*stop bit (transition could occur earlier); 1 instr*/ \
    spare_6instr; \
	PROGPAD(10); \
}

#endif //ndef WS281X_H
//eof