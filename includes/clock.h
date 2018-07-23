////////////////////////////////////////////////////////////////////////////////
////
/// Clock defs
//

#ifndef _CLOCK_H
#define _CLOCK_H

#include "compiler.h" //sets PIC16X based on device type


//convenience macros (for readability):
//CAUTION: force UL arithmetic to avoid precision errors
//NOTE: caller might need parentheses, depending on usage
#define usec
#define msec  *1000UL
#define sec  *1000000UL
#define MHz  *1000000UL
#define KHz  *1000UL
//#define K  *1024 //needed sooner


//instruction timing:
//;NOTE: these require 32-bit arithmetic.
//Calculations are exact for small numbers, but might wrap or round for larger numbers (needs 32-bit arithmetic at compile time).
//;misc timing consts:
//#define ONE_MSEC  (1 msec) //1000
//#define ONE_SEC  (1 sec) //1000000
//#define MHz(clock)  ((clock)/ONE_SEC)


//define clock speed range:
//TODO: define max ext clock freq?
#ifdef PIC16X //extended instr set (faster PICs)
// #warning "PIC16X max int clock is 32 MHz (using 4x PLL)"
 #define MAX_INTOSC_FREQ  (32 MHz) //uses 4x PLL; 8 MIPS
 #define DEF_INTOSC_FREQ  (500 KHz) //CAUTION: MF, not HF!
 #define IntOsc_PrescalarOffset  (8-1) //kludge: 2 values for LFINTOSC; skip 1
 #define IntOsc_MaxPrescalar  15
#else
// #warning "PIC16 (non-extended) max int clock is 8 MHz"
 #define MAX_INTOSC_FREQ  (8 MHz) //2 MIPS
 #define DEF_INTOSC_FREQ  (4 MHz) //1 MIPS
 #define IntOsc_PrescalarOffset  0
 #define IntOsc_MaxPrescalar  7
 #define PLL  1 //no PLL available
#endif

#ifdef EXT_CLOCK_FREQ //ext clock will be present
// #define UseIntOsc  (CLOCK_FREQ == MAX_INTOSC_FREQ)
// #if EXT_CLOCK_FREQ > 
 #define CLOCK_FREQ  EXT_CLOCK_FREQ
 #define UseIntOsc  FALSE
#elif defined(CLOCK_FREQ) //use int osc
// #define CLOCK_FREQ  MAX_INTOSC_FREQ
// #if (INT_OSC_FREQ != 8 MHz)
// #define CLOCK_FREQ  INT_OSC_FREQ
 #define UseIntOsc  TRUE
#elif defined(PIC16X)
 #error RED_MSG "[ERROR] No clock freq specified" //default is MF, not HF; force caller to explicitly choose
#else //use default (internal) osc freq
 #define CLOCK_FREQ  DEF_INTOSC_FREQ
 #define UseIntOsc  TRUE
//#elif CLOCK_FREQ == 0 //use max internal osc freq
// #undef CLOCK_FREQ
// #define CLOCK_FREQ  MAX_INT_OSC_FREQ
// #define UseIntOsc  TRUE
#endif


//Int osc configuration:
//Prescalar and preset values are defined below based on desired clock speed
//#ifdef PIC16X //extended/faster PIC
#ifndef PLL
 #define PLL  IIF(CLOCK_FREQ > 8 MHz, 4, 1) //need PLL
//BoostC doesn't like IIF in #pragma config
// #if CLOCK_FREQ > (8 MHz)
//  #define PLL  4 //need PLL for faster speeds
// #else
//  #define PLL  1
// #endif
// #define IntOsc_PrescalarOffset  (8-1) //kludge: 2 values for LFINTOSC; skip 1
// #define IntOsc_MaxPrescalar  15
// #define UseIntOsc  (CLOCK_FREQ <= 8 MHz * PLL) //PIX16X //int osc is fast enough (with PLL)
//#else //non-extended (slower) processors
// #define PLL  1 //no PLL available
// #define IntOsc_PrescalarOffset  0
// #define IntOsc_MaxPrescalar  7
#endif
//#define PLL  IIF(CLOCK_FREQ > 8 MHz, 4, 1) //need PLL; BoostC doesn't like IIF in #pragma config
//#if CLOCK_FREQ > (8 MHz)
// #define PLL  4
//#else
// #define PLL  1
//#endif
//#define UseIntOsc  (CLOCK_FREQ <= MAX_INTOSC_FREQ) //8 MHz * PLL) //PIX16X //int osc is fast enough (with PLL)
//#if CLOCK_FREQ > 8 MHz * PLL
// #define UseIntOsc  FALSE //too fast for int osc
//#else
// #define UseIntOsc  TRUE
//#endif
//#define SCS_INTOSC  1 //0 //use config, which will be set to int osc (PLL requires 0 here)

//make conditional calculations on PLL more concise:
#if PLL != 1
 #define IFPLL(stmt)  stmt
#else
 #define IFPLL(stmt)
#endif


//instruction timing:
//Microchip PICs are nice in that they use (mostly) fixed instruction timing
//#define CLOCK_FREQ  (eval(DEVICE)##_FREQ)
//#define CLOCK_FREQ  CLOCK_FREQ_eval(DEVICE) //(eval(DEVICE)##_FREQ)
//#define CLOCK_FREQ_eval(device)  eval(device)##_FREQ
#define INSTR_CYCLES  4UL //#clock cycles per instr (constant for PICs); CAUTION: force UL arithmetic to avoid precision errors
//#define InstrPerSec(clock)  rdiv(clock, INSTR_CYCLES)  //;#instructions/sec at specified clock speed; clock freq is always a multiple of INSTR_CYCLES
//#define InstrPerSec(...)  ALLOW_2ARGS(__VA_ARGS__, InstrPerSec_2ARGS, InstrPerSec_1ARG, InstrPerSec_0ARGS) (__VA_ARGS__)
//#define InstrPerSec_0ARGS()  InstrPerSec_1ARGS(CLOCK_FREQ)
//#define InstrPerSec_1ARG(clock)  InstrPerSec_2ARGS(clock, /1)
#define InstrPerSec(clock)  rdiv(clock, INSTR_CYCLES)  //;#instructions/sec at specified clock speed; clock freq is always a multiple of INSTR_CYCLES
//#define InstrPerMsec(...)  ALLOW_1ARG(__VA_ARGS__, InstrPerMsec_1ARG, InstrPerMsec_0ARGS) (__VA_ARGS__)
//#define InstrPerMsec_0ARGS()  InstrPerSec_1ARG(CLOCK_FREQ)
//#define InstrPerMsec_1ARG(clock)  InstrPerSec(clock, /1000) //InstrPerSec(rdiv(clock, 1 msec))  //;#instructions/msec at specified clock speed; not rounded but clock speeds are high enough that this doesn't matter
#define InstrPerMsec(clock)  InstrPerSec((clock) /1000UL) //InstrPerSec(rdiv(clock, 1 msec))  //;#instructions/msec at specified clock speed; not rounded but clock speeds are high enough that this doesn't matter
//#define InstrPerUsec(...)  ALLOW_1ARG(__VA_ARGS__, InstrPerUsec_1ARG, InstrPerUsec_0ARGS) (__VA_ARGS__)
//#define InstrPerUsec_0ARGS()  InstrPerUsec_1ARG(CLOCK_FREQ)
//#define InstrPerUsec_1ARG(clock)  InstrPerSec(clock, /1000000) //InstrPerSec(rdiv(clock, 1 sec)) //CAUTION: usually this one is fractional, so it's not accurate with integer arithmetic
#define InstrPerUsec(clock)  InstrPerSec((clock) /1000000UL) //InstrPerSec(rdiv(clock, 1 sec)) //CAUTION: usually this one is fractional, so it's not accurate with integer arithmetic
#define MIPS(clock)  InstrPerUsec(clock)


//#define Instr2uSec(instr, clock)  ((instr) / InstrPerUsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
//NOTE: this only seems to work up to 32 usec:
//#define Instr2Sec(...)  ALLOW_3ARGS(__VA_ARGS__, Instr2uSec_3ARGS, Instr2uSec_2ARGS, Instr2uSec_1ARG) (__VA_ARGS__)
//#define Instr2Sec_1ARG(instr)  Instr2uSec_2ARGS(instr, CLOCK_FREQ) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
//#define Instr2Sec_2ARGS(instr, clock)  Instr2uSec_3ARGS(instr, clock, usec) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
//#define Instr2Sec_3ARGS(instr, clock, scaled)  rdiv((instr) * INSTR_CYCLES scaled, clock) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
#define Instr2Sec(...)  ALLOW_2ARGS(__VA_ARGS__, Instr2Sec_2ARGS, Instr2Sec_1ARG) (__VA_ARGS__)
#define Instr2Sec_1ARG(instr)  Instr2Sec_2ARGS(instr, CLOCK_FREQ) // / PLL) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
#define Instr2Sec_2ARGS(instr, clock)  rdiv((instr) * INSTR_CYCLES, clock) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors

//#define Instr2mSec(instr, clock)  ((instr) / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
#define Instr2Msec(...)  ALLOW_2ARGS(__VA_ARGS__, Instr2Msec_2ARGS, Instr2Msec_1ARG, missing) (__VA_ARGS__)
#define Instr2Msec_1ARG(instr)  Instr2Msec_2ARGS(instr, CLOCK_FREQ) // / PLL)
#define Instr2Msec_2ARGS(instr, clock)  IIF((instr) < 1000UL, Instr2Sec((instr) *1000UL, clock), Instr2Sec(instr, (clock) /1000UL)) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors

//#define Instr2uSec(instr, clock)  InstrPerSec((instr) * (clock), clock) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
#define Instr2Usec(...)  ALLOW_2ARGS(__VA_ARGS__, Instr2Usec_2ARGS, Instr2Usec_1ARG, missing) (__VA_ARGS__)
#define Instr2Usec_1ARG(instr)  Instr2Usec_2ARGS(instr, CLOCK_FREQ) // / PLL)
#define Instr2Usec_2ARGS(instr, clock)  IIF((instr) < 1000UL, Instr2Sec((instr) *1000000UL, clock), Instr2Sec((instr) *1000UL, (clock) /1000UL)) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors


//#define uSec2Instr(usec, clock)  ((usec) * InstrPerUsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
//#define uSec2Instr(usec, clock)  ((usec) * InstrPerMsec(clock) / ONE_MSEC) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
#define Sec2Instr(...)  ALLOW_2ARGS(__VA_ARGS__, Sec2Instr_2ARGS, Sec2Instr_1ARG, missing) (__VA_ARGS__)
#define Sec2Instr_1ARG(sec)  Sec2Instr_2ARGS(sec, CLOCK_FREQ) // / PLL)
#define Sec2Instr_2ARGS(sec, clock)  InstrPerSec((sec) * (clock)) //Sec2Instr ((sec) * InstrPerMsec(clock) / ONE_MSEC) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors

//use this one for larger values:
//#define mSec2Instr(msec, clock)  ((msec) * InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
#define Msec2Instr(...)  ALLOW_2ARGS(__VA_ARGS__, Msec2Instr_2ARGS, Msec2Instr_1ARG, missing) (__VA_ARGS__)
#define Msec2Instr_1ARG(msec)  Msec2Instr_2ARGS(msec, CLOCK_FREQ) // / PLL)
#define Msec2Instr_2ARGS(msec, clock)  IIF((msec) < 1000UL, InstrPerMsec((msec) * (clock)), InstrPerSec(rdiv(msec, 1000UL) * (clock))) //Sec2Instr ((sec) * InstrPerMsec(clock) / ONE_MSEC) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors

#define Usec2Instr(...)  ALLOW_2ARGS(__VA_ARGS__, Usec2Instr_2ARGS, Usec2Instr_1ARG, missing) (__VA_ARGS__)
#define Usec2Instr_1ARG(usec)  Usec2Instr_2ARGS(usec, CLOCK_FREQ) // / PLL)
#define Usec2Instr_2ARGS(usec, clock)  IIF((usec) < 1000UL, InstrPerUsec((usec) * (clock)), InstrPerMsec(rdiv(usec, 1000UL) * (clock))) //Sec2Instr ((sec) * InstrPerMsec(clock) / ONE_MSEC) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors

//#if CLOCK_FREQ == 32 MHz
// #if Instr2uSec(120, CLOCK_FREQ) != 15
//  #warning YELLOW_MSG "Instr2uSec bad arithmetic; taking shortcut"
//  #undef Instr2uSec
//  #define Instr2uSec(usec, clock)  ((usec) / 8)
// #else
//  #warning YELLOW_MSG "is okay?"
// #endif
//#endif


#if 0
//kludge: #warning doesn't reduce macro values, so force it here (mainly for debug/readability):
#if CLOCK_FREQ == 20 MHz
 #if UseIntOsc
  #define CLOCK_FREQ_tostr  "20 MHz (int)"
 #else
  #define CLOCK_FREQ_tostr  "20 MHz (ext)"
 #endif
#elif CLOCK_FREQ == 32 MHz
 #if UseIntOsc
  #define CLOCK_FREQ_tostr  "32 MHz (int, with PLL)"
 #else
  #define CLOCK_FREQ_tostr  "32 MHz (ext, with PLL)"
 #endif
#elif CLOCK_FREQ == 18432000
 #if UseIntOsc
  #define CLOCK_FREQ_tostr  "18.432 MHz (int)"
 #else
  #define CLOCK_FREQ_tostr  "18.432 MHz (ext)"
 #endif
#else
 #define CLOCK_FREQ_tostr  CLOCK_FREQ UseIntOsc
#endif
//#endif
//#endif
//#endif
#endif


#ifdef PIC16X //extended instr set
 #warning BLUE_MSG "[INFO] Compiled for " TOSTR(DEVICE) " running at " TOSTR(CLOCK_FREQ) " (PLL " TOSTR(PLL) ") with extended instruction set."
// #define GPRAM_LINEAR_START  0x2000
// #warning BLUE_MSG "device "DEVICE" has ext instr set, "GPRAM_LINEAR_SIZE" ram"
// #define RAM(device)  device##_RAM
/////// #define _GPRAM_LINEAR_SIZE(device)  (concat(device, _RAM) - 16)
//#define GPRAM_LINEAR_SIZE  ((4 * 0x50) + 0x30) //384 excludes 16 bytes non-banked GP RAM
//#define GPRAM_LINEAR_SIZE  ((12 * 0x50) + 0x30) //1024 excludes 16 bytes non-banked GP RAM
//#define GPRAM_LINEAR_SIZE  ((1 * 0x50) + 0x20) //128 excludes 16 bytes non-banked GP RAM
//#define GPRAM_LINEAR_SIZE  ((3 * 0x50)) //256 excludes 16 bytes non-banked GP RAM
#else
 #warning BLUE_MSG "[INFO] Compiled for " TOSTR(DEVICE) " running at " TOSTR(CLOCK_FREQ) " (no PLL) with NON-extended instruction set."
#endif


//#define TimerPreset(duration, overhead, which, clock)  (0 - rdiv(Usec2Instr(duration, clock) + overhead, which##_Prescalar))

#ifndef LFINTOSC_FREQ
 #define LFINTOSC_FREQ  31250UL //31.25 KHz LFINTOSC
#endif

//#define IntOsc_MinPrescalarSize  0 //smallest configurable Int Osc prescalar bit size; smallest prescalar is 1:1; 1:1 is actually a special case (LFINTOSC)
//#define IntOsc_MaxPrescalarSize  7 //largest configurable Int Osc prescalar bit size; largest prescalar is 1:128
//#define Timer0_PrescalarSize(range, clock)  NumBits(uSec2Instr(range, clock))-8) //;bit size of prescalar
//#define Timer0_Prescalar(clock)  Prescalar(Timer0_Range, clock) //;gives a Timer0 range of Timer0_Range at the specified clock frequency
//#define IntOsc_Prescalar(clock)  (NumBits8(InstrPerSec(clock) / LFINTOSC_FREQ) + IntOsc_PrescalarOffset) //;Int osc prescalar
#define IntOsc_Prescalar(clock)  MIN(NumBits8(InstrPerSec(clock) / LFINTOSC_FREQ) + IntOsc_PrescalarOffset,  IntOsc_MaxPrescalar) //;Int osc prescalar

#if NumBits8(InstrPerSec(CLOCK_FREQ) / LFINTOSC_FREQ) >= IntOsc_MaxPrescalar
 #error RED_MSG "[ERROR] Invalid clock freq " TOSTR(CLOCK_FREQ)
#endif

//OSCCON config:
//Sets internal oscillator frequency and source.
#define MY_OSCCON(clock)  \
(0 \
	| (IntOsc_Prescalar((clock) / PLL) /*<< IRCF0*/ * _IRCF0) /*set clock speed; bump up to max*/ \
	| IIFNZ(!UseIntOsc /*&& (PLL == 1)*/, /*1 << SCS0*/ _SCS0) /*;use CONFIG clock source (ext clock), else internal osc; NOTE: always use int osc; if there's an ext clock then it failed*/ \
)


#ifdef CLOCK_DEBUG //debug
 #warning "[INFO] Including clock debug info"
 #ifndef debug
  #define debug() //define debug chain
 #endif
//define globals to shorten symbol names (local vars use function name as prefix):
//also, sdcc doesn't like "volatile" and "at" within functions
//    volatile AT_NONBANKED(0) uint32_t clock_freq_debug; //= CLOCK_FREQ;
//    volatile AT_NONBANKED(0) uint32_t max_intosc_debug; //= MAX_INTOSC_FREQ;
//    volatile AT_NONBANKED(0) uint8_t intosc_prescalar_debug; //= IntOsc_Prescalar(CLOCK_FREQ);
//    volatile AT_NONBANKED(0) uint8_t use_intosc_debug; //= UseIntOsc;
//    volatile AT_NONBANKED(0) uint8_t pll_debug; //= PLL;
//    volatile AT_NONBANKED(0) uint8_t osccon_debug; //= MY_OSCCON(CLOCK_FREQ);
//    volatile AT_NONBANKED(0) uint32_t instrpersec_debug;
//    volatile AT_NONBANKED(0) uint32_t instrpermsec_debug;
//    volatile AT_NONBANKED(0) uint32_t instrperusec_debug;
//    volatile AT_NONBANKED(0) uint32_t usec2instr1_debug;
//    volatile AT_NONBANKED(0) uint32_t usec2instr2_debug;
//    volatile AT_NONBANKED(0) uint32_t msec2instr3_debug;
//    volatile AT_NONBANKED(0) uint32_t usec2instr4_debug;
//    volatile AT_NONBANKED(0) uint32_t msec2instr5_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec1_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec2_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec3_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec4_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec5_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec6_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec7_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec8_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec9_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2usec10_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2msec11_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2msec12_debug;
//    volatile AT_NONBANKED(0) uint32_t instr2msec_debug;
 /*INLINE*/ void clock_debug(void)
 {
    volatile /*AT_NONBANKED(0)*/ uint32_t freq = CLOCK_FREQ; //32 MHz == 0x1e8,4800, 4 MHz == 0x3d,0900, 1 MHz == 0xf,4240
    volatile /*AT_NONBANKED(0)*/ uint32_t max_intosc = MAX_INTOSC_FREQ; //8 MHz (no PLL) == 0x7a,1200, 32 MHz (4x PLL) == 0x1e8,4800
    volatile /*AT_NONBANKED(0)*/ uint8_t int_prescalar = IntOsc_Prescalar(CLOCK_FREQ); //should be 15 for 32 MHz PIC16X, 7 for 8 MHz PIC16
    volatile /*AT_NONBANKED(0)*/ uint8_t use_intosc = UseIntOsc;
    volatile /*AT_NONBANKED(0)*/ uint8_t pll = PLL; //should be 4 if PLL used, 1 otherwise
    volatile /*AT_NONBANKED(0)*/ uint8_t osccon = MY_OSCCON(CLOCK_FREQ); //should be 0x70 for 8 MHz int osc and clock src controlled by Config
    volatile /*AT_NONBANKED(0)*/ uint32_t instrpersec = InstrPerSec(CLOCK_FREQ); //8M @ 8 MIPS == 0x7a,1200
    volatile /*AT_NONBANKED(0)*/ uint32_t instrpermsec = InstrPerMsec(CLOCK_FREQ); //8K @ 8 MIPS == 0x1f40
    volatile /*AT_NONBANKED(0)*/ uint32_t instrperusec = InstrPerUsec(CLOCK_FREQ); //8 @ 8 MIPS
    volatile /*AT_NONBANKED(0)*/ uint32_t usec2instr1 = Usec2Instr(128); //, CLOCK_FREQ); //should be 1K @ 8 MIPS (8 MIPS == 128 nsec/instr) == 0x400
    volatile /*AT_NONBANKED(0)*/ uint32_t usec2instr2 = Usec2Instr(/*U16FIXUP*/(50 msec)); //, CLOCK_FREQ); //should be 400K @ 8 MIPS (50 msec == 1/20 sec) == 0x6,1a80
    volatile /*AT_NONBANKED(0)*/ uint32_t msec2instr3 = Msec2Instr(50); //, CLOCK_FREQ); //should be ~ 400K @ 8 MIPS
    volatile /*AT_NONBANKED(0)*/ uint32_t usec2instr4 = Usec2Instr(120 msec); //, CLOCK_FREQ); //should be 1M @ 8 MIPS == 0xf,4240 ~= 960K == 0xe,a600
    volatile /*AT_NONBANKED(0)*/ uint32_t msec2instr5 = Msec2Instr(120); //, CLOCK_FREQ); //should be ~ 1M @ 8 MIPS
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec1 = Instr2Usec(8); //, CLOCK_FREQ); //should be 1 @ 8 MIPS
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec2 = Instr2Usec(32); //, CLOCK_FREQ); //should be 4 @ 8 MIPS
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec3 = Instr2Usec(40); //, CLOCK_FREQ); //should be 5 @ 8 MIPS
//    instr2usec_debug = Instr2uSec(56, CLOCK_FREQ); //should be 7 @ 8 MIPS
//    instr2usec_debug = Instr2uSec(72, CLOCK_FREQ); //should be 9 @ 8 MIPS
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec4 = Instr2Usec(120); //, CLOCK_FREQ); //should be 15 @ 8 MIPS
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec5 = Instr2Usec(64000); //, CLOCK_FREQ); //should be 8K @ 8 MIPS; 8,000 == 0x1f40
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec6 = Instr2Usec(128000); //, CLOCK_FREQ); //should be 16K @ 8 MIPS; 16,000 == 0x3e80
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec7 = Instr2Usec(320000); //, CLOCK_FREQ); //should be 40K @ 8 MIPS; 40,000 == 0x9c40
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec8 = Instr2Usec(65535); //, CLOCK_FREQ); //should be ~ 8K @ 8 MIPS; 8K == 0x2000
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec9 = Instr2Usec(65536 * 8); //, CLOCK_FREQ); //should be 64K @ 8 MIPS; 65,536 == 0x1,0000
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2usec10 = Instr2Usec(65537 * 8); //, CLOCK_FREQ); //should be ~ 64K @ 8 MIPS; 65,537 == 0x1,0001
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2msec11 = Instr2Msec(64000); //, CLOCK_FREQ); //should be 8 @ 8 MIPS
    volatile /*AT_NONBANKED(0)*/ uint32_t instr2msec12 = Instr2Msec(320000); //, CLOCK_FREQ); //should be 40 @ 8 MIPS; 40 == 0x28
//    instr2usec_debug = 2 * U16FIXUP(60 * ONE_MSEC);
//    instr2usec_debug = InstrPerMsec(CLOCK_FREQ);
//    instr2usec_debug = (120 * ONE_MSEC / InstrPerMsec(CLOCK_FREQ));
    debug(); //incl other debug
//    freq = 0;
 }
 #undef debug
 #define debug()  clock_debug()
#endif

#if 0
#warning CYAN_MSG "[DEBUG] instr/sec " TOSTR(InstrPerSec(CLOCK_FREQ))
#warning CYAN_MSG "[DEBUG] #bits " TOSTR(NumBits8(InstrPerSec(CLOCK_FREQ) / LFINTOSC_FREQ))
#warning CYAN_MSG "[DEBUG] presc " TOSTR(IntOsc_Prescalar(CLOCK_FREQ))
#warning CYAN_MSG "[DEBUG] osccon " TOSTR(IntOsc_Prescalar(CLOCK_FREQ / PLL) * _IRCF0)
INLINE void debug(void)
{
    volatile uint8_t val;
    val = InstrPerSec(CLOCK_FREQ);
    val = NumBits8(InstrPerSec(CLOCK_FREQ) / LFINTOSC_FREQ);
    val = IntOsc_Prescalar(CLOCK_FREQ);
    val = IntOsc_Prescalar(CLOCK_FREQ / PLL) * _IRCF0;
}
#endif

#ifndef init
 #define init() //initialize function chain
#endif

//;initialize clock:
//NOTE: power-up default speed for PIC16F688 is 1 MIPS (4 MHz)
INLINE void init_clock(void)
{
//    LABDCL(0xCF);
//    debug();
//??	if (!osccon.OSTS) //running from int osc
//	if (UseIntOsc || ExtClockFailed) /*can only change int osc freq*/
//	{
//		if (CLOCK_FREQ == MAX_INTOSC_FREQ)
//#define UseIntOsc  (CLOCK_FREQ <= 8 MHz * PLL) //PIX16X //int osc is fast enough (with PLL)
#if CLOCK_FREQ > MAX_INTOSC_FREQ
 #error RED_MSG "[ERROR] Clock setting " TOSTR(CLOCK_FREQ) " exceeds int osc limit"
//		if (ExtClockFailed) osccon = MY_OSCCON(MAX_INTOSC_FREQ); //run as fast as we can on internal oscillator
//		else
#endif
//		osccon = 0x70; //8 MHz or 32 MHz (2 MIPS or 8 MIPS); 8 MIPS ==> 125 nsec/instr, 2 MIPS ==> 500 nsec/instr
		OSCCON = MY_OSCCON(CLOCK_FREQ); //| IIF(!UseIntOsc, 1 << SCS, 0); /*should be 0x70 for 32MHz (8 MHz + PLL) 16F1827 or 8MHz 16F688*/;NOTE: FCM does not set SCS, so set it manually (page 31); serial port seems to be messed up without this!
#if 0 //is this really needed? (initialization code takes a while anyway); easier IDE debug without it
		while (!oscstat.HFIOFS); /*wait for new osc freq to stabilize (affects other timing)*/
		IFPLL(while (!oscstat.PLLR)); /*wait for PLL to stabilize*/
#endif
//	}
	init(); //clock init first to give it more time to stabilize before other logic starts
}
#undef init
#define init()  init_clock() //function chain in lieu of static init


#endif //ndef _CLOCK_H
//eof