#ifndef _TIMERS_H
#define _TIMERS_H

#include "compiler.h" //device registers
#include "helpers.h" //U16FIXUP(), RED_MSG, IIF(), NumBits(), TOSTR()
#include "clock.h" //Instr2uSec()


////////////////////////////////////////////////////////////////////////////////
////
/// Generic timer logic:
//

//wait specified #usec:
//NOTE: duration should be a const so preset can be calculated at compile time rather than run time!
//    TMR1_16 = U16FIXUP(TMR1_PRESET_1msec); //avoid overflow; / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
#define wait(...)  USE_ARG4(__VA_ARGS__, wait_3ARGS, wait_2ARGS, wait_1ARG) (__VA_ARGS__)
#define wait_1ARG(duration)  wait_2ARGS(duration, ) //just busy wait; TODO: yield()?
void error(const char* msg); //dummy ref to get past first pass
//TODO: fix "unreachable code" warnings below:
#define wait_2ARGS(duration, idler)  \
{ \
    if (duration < Timer1_Limit) { wait4tmr1(duration, idler, false); } /*no loop needed*/ \
    else if (duration < 256 * Timer1_Limit) /*8-bit loop on Timer 1 (~max 16 sec)*/ \
    { \
		volatile BANK0 uint8_t delay_loop8 = divup(duration, Timer1_Limit); /*TMR1 is in Bank 0, so put loop counter there also*/ \
		for (;;) /*NOTE: cumulative timer will compensate for idler overrun during next timer cycle*/ \
		{ \
            wait4tmr1(rdiv(duration, divup(duration, Timer1_Limit)), idler, true); \
            if (--delay_loop8) continue; /*NOTE: decfsz does NOT set status.Z*/ \
			break; \
		} \
	} \
    else if (duration < 256 * 256 * Timer1_Limit) /*16-bit loop on Timer 1 (max ~ 1 hr)*/ \
    { \
		volatile BANK0 uint16_t delay_loop16 = divup(duration, Timer1_Limit); /*TMR1 is in Bank 0, so put loop counter there also*/ \
		for (;;) /*NOTE: cumulative timer will compensate for idler overrun during next timer cycle*/ \
		{ \
            wait4tmr1(rdiv(duration, divup(duration, Timer1_Limit)), idler, true); \
            if (--delay_loop16) continue; /*NOTE: decfsz does NOT set status.Z*/ \
			break; \
		} \
	} \
    else error("out of range"); \
}


////////////////////////////////////////////////////////////////////////////////
////
/// Timer 0 (8 bits):
//

#ifndef Timer0_range
 #define Timer0_range  (100UL usec)
#endif

#define TMR0_TICKS(usec)  (0 - TimerPreset(usec, 0, Timer0, CLOCK_FREQ))
#define Timer0_Limit  Instr2uSec(256 * Timer0_Prescalar, CLOCK_FREQ) //max duration for Timer 0

//choose the smallest prescalar that will give the desired range:
//smaller prescalars give better accuracy, but it needs to be large enough to cover the desired range of time intervals
//since ext clock freq > int osc freq, only need to check faster (ext) freq here

//kludge: use trial & error to select prescalar:
//hard-coded values work, except BoostC has arithmetic errors with values of 32768 so try to choose an alternate value here
//#define Timer0_Prescalar  4 //max 256; 4:1 prescalar + 8-bit timer gives 1K instr total range (128 - 205 usec); 8-bit loop gives ~32 - 52 msec total
//#define Timer1_Prescalar  4 //max 8; 4:1 prescalar + 16-bit timer gives ~262K instr total range (~ 33 - 52 msec); 8-bit loop gives ~8 - 13 sec total
#define Timer0_Prescalar  1UL
#if Timer0_Limit < 1
 #warning RED_MSG "[ERROR] Timer0 limit arithmetic bad" TOSTR(Timer0_Limit)
#endif
#if Timer0_Limit < Timer0_range
 #undef Timer0_Prescalar
 #define Timer0_Prescalar  2UL
 #if Timer0_Limit < Timer0_range
  #undef Timer0_Prescalar
  #define Timer0_Prescalar  4UL
  #if Timer0_Limit < Timer0_range
   #undef Timer0_Prescalar
   #define Timer0_Prescalar  8UL
   #if Timer0_Limit < Timer0_range //could go up to 256, but getting inaccurate by then so stop here
    #error RED_MSG "[ERROR] Can't find a Timer0 prescalar to give " TOSTR(Timer0_range) " usec range"
   #endif
  #endif
 #endif
#endif

#if 0
#if Timer0_Limit == 256*4000/8000 //8 MIPS
 #define Timer0_Limit_tostr  "128 usec"
// #undef Timer0_Limit
// #define Timer0_Limit  128 //kludge: avoid macro body problems or arithmetic errors in BoostC
#elif Timer0_Limit == 256*2000/4608 //4.6 MIPS
 #define Timer0_Limit_tostr  "111 usec"
// #undef Timer0_Limit
// #define Timer0_Limit  222 //kludge: avoid macro body problems or arithmetic errors in BoostC
#elif Timer0_Limit == 256*4000/5000 //5 MIPS
 #define Timer0_Limit_tostr  "204 usec"
// #undef Timer0_Limit
// #define Timer0_Limit  204 //kludge: avoid macro body problems or arithmetic errors in BoostC
#elif Timer0_Limit == 256*4000/4608 //4.6 MIPS
 #define Timer0_Limit_tostr  "222 usec"
// #undef Timer0_Limit
// #define Timer0_Limit  222 //kludge: avoid macro body problems or arithmetic errors in BoostC
#elif Timer0_Limit == 0
 #error RED_MSG "[ERROR] Timer 0 limit arithmetic is broken"
#else
 #define Timer0_Limit_tostr  Timer0_Limit usec
#endif
//#endif
//#endif
//#endif
//#endif
#endif


#warning BLUE_MSG "[INFO] Timer 0 limit is " TOSTR(Timer0_Limit) " with " TOSTR(Timer0_Prescalar) ":1 prescalar."

//volatile bit Timer0Wrap @adrsof(INTCON).T0IF; //timer 0 8-bit wrap-around
#define Timer0Wrap  T0IF //timer 0 8-bit wrap-around


//asociate timer regs with names:
#define Timer0_reg  TMR0 //tmr0
#define Timer0_ADDR  TMR0_ADDR


//OPTIONS reg configuration:
//Turns misc control bits on/off, and set prescalar as determined above.
#define MY_OPTIONS(clock)  \
(0 \
	| IIFNZ(FALSE, /*1<<NOT_WPUEN*/ _NOT_WPUEN) /*;enable weak pull-ups on PORTA (needed to pull ZC high when open); might mess up charlieplexing, so turn off for other pins*/ \
	| IIFNZ(DONT_CARE, /*1<<T0SE*/ _T0SE) /*;Timer 0 source edge: don't care*/ \
	| IIFNZ(DONT_CARE, /*1<<INTEDG*/ _INTEDG) /*;Ext interrupt not used*/ \
	| IIFNZ(FALSE, /*1<<PSA*/ _PSA) /*;FALSE => pre-scalar assigned to timer 0, TRUE => WDT*/ \
	| IIFNZ(FALSE, /*1<<T0CS*/ _T0CS) /*FALSE: Timer 0 clock source = (FOSC/4), TRUE: T0CKI pin*/ \
	| ((NumBits8(Timer0_Prescalar) - 2) /*<< PS0*/ * _PS0) /*;prescalar value log2*/ \
)


#ifndef NUMSLOTS
 #define NUMSLOTS  256
#endif

//Timer 0 presets:
#define DIMSLICE  rdiv(1 sec, NUMSLOTS /*?? +6*/) //timeslice to use for 255 dimming levels at given rate
#define EVENT_OVERHEAD  2 //20 //approx #instr to flush display event and start next dimming timeslot; all prep overhead occurs before start of timeslot to reduce latency and jitter
#define TMR0_PRESET_DC50Hz  TimerPreset(rdiv(DIMSLICE, 50), EVENT_OVERHEAD, Timer0, CLOCK_FREQ) //should be ~ 86 usec
#define TMR0_PRESET_AC50Hz  TimerPreset(rdiv(DIMSLICE, 2 * 50), EVENT_OVERHEAD, Timer0, CLOCK_FREQ) //should be ~ 43 usec
#define TMR0_PRESET_AC60Hz  TimerPreset(rdiv(DIMSLICE, 2 * 60), EVENT_OVERHEAD, Timer0, CLOCK_FREQ) //should be ~ 32 usec
volatile BANK0 uint8_t Timer0_Preset;
//with 4:1 prescalar, Timer 0 interval is 0.5 usec @ 8 MIPS, preset for 30 usec tick ~= 60


#ifdef TIMER0_DEBUG //debug
 #ifndef debug
  #define debug() //define debug chain
 #endif
//define globals to shorten symbol names (local vars use function name as prefix):
    volatile AT_NONBANKED(0) uint8_t optreg_debug; //= MY_OPTIONS(CLOCK_FREQ / PLL);
    volatile AT_NONBANKED(0) uint16_t tmr0_dimslice_debug; //= DIMSLICE;
    volatile AT_NONBANKED(0) uint16_t tmr0_preset_50dc_debug; //= TMR0_PRESET_DC50Hz;
    volatile AT_NONBANKED(0) uint16_t tmr0_preset_50ac_debug; //= TMR0_PRESET_AC50Hz;
    volatile AT_NONBANKED(0) uint16_t tmr0_preset_60ac_debug; //= TMR0_PRESET_AC60Hz;
    volatile AT_NONBANKED(0) uint8_t tmr0_presbits_debug; //= NumBits8(Timer0_Prescalar);
    volatile AT_NONBANKED(0) uint8_t tmr0_prescalar_debug; //= Timer0_Prescalar;
    volatile AT_NONBANKED(0) uint16_t tmr0_limit_debug; //= Timer0_Limit;
    volatile AT_NONBANKED(0) uint16_t tmr0_ticks_test1_debug; //= TMR0_TICKS(30 usec);
    volatile AT_NONBANKED(0) uint16_t tmr0_ticks_test2_debug; //= TMR0_TICKS(100 usec);
 INLINE void tmr_dim_debug(void)
 {
    debug(); //incl prev debug first
    optreg_debug = MY_OPTIONS(CLOCK_FREQ / PLL);
    tmr0_dimslice_debug = DIMSLICE;
    tmr0_preset_50dc_debug = TMR0_PRESET_DC50Hz; //should be ~ 100 (156 * 0.5 usec * 50 Hz * 256 ~= 1 sec
    tmr0_preset_50ac_debug = TMR0_PRESET_AC50Hz; //should be ~ 178 (78 * 0.5 usec * 2*50 Hz * 256 ~= 1 sec
    tmr0_preset_60ac_debug = TMR0_PRESET_AC60Hz; //should be ~ 191 (65 * 0.5 usec * 2*60 Hz * 256 ~= 1 sec
    tmr0_presbits_debug = NumBits8(Timer0_Prescalar);
    tmr0_prescalar_debug = Timer0_Prescalar;
    tmr0_limit_debug = Timer0_Limit;
    tmr0_ticks_test1_debug = TMR0_TICKS(30 usec); //should be 60
    tmr0_ticks_test2_debug = TMR0_TICKS(100 usec); //should be 200
 }
 #undef debug
 #define debug()  tmr_dim_debug()
#endif


//#define TMR0_reset(...)  USE_ARG2(__VA_ARGS__, TMR0_reset_1ARG, TMR0_reset_0ARGS) (__VA_ARGS__)
//#define TMR0_reset_0ARGS(val)  TMR0_reset_1ARG(TRUE) //relative
//#define TMR0_reset_1ARG(relative)  
//restart current timer interval:
//NOTE: fractional interval will be lost
INLINE void TMR0_reset()
{
//	if (relative) TMR0 += Timer0_Preset; 
//    else
    TMR0 = Timer0_Preset;
}


//wait for Timer 0 to wrap:
//idler() can do other work while waiting
#define wait4tmr0(delay_usec, idler, cumulative)  \
{ \
    /*TODO: if (cumulative) TMR1_16 += preset; //for better total accuaracy*/ \
    TMR0 = TimerPreset(/*U16FIXUP(1 msec)*/ delay_usec, 2, Timer0, CLOCK_FREQ); /*start with fresh interval*/ \
    TMR0IF = FALSE; /*prevent false trigger first time; NOTE: data sheets say this must be cleared in software*/ \
    while (!TMR0IF) idler; \
}
//    /*while (!TMR1IF) idler; //gives "unreadable code" warnings in sdcc*/;
//    for (;;)
//    {
//        if (TMR1IF) break;
//        idler();
//        if (NEVER) break;
//    }


//;initialize timer 0:
INLINE void init_tmr0(void)
{
	init(); //prev init first
    LABDCL(0x00);
    Timer0_Preset = TMR0_PRESET_DC50Hz; //assume 50 Hz DC until ZC detected
	OPTION_REG = MY_OPTIONS(CLOCK_FREQ / PLL); /*should be 0x00 for 1:2 prescalar or 0x01 for 1:4 prescalar (0x80/0x81 if no WPU)*/
//    intcon = MY_INTCON;
}
#undef init
#define init()  init_tmr0() //function chain in lieu of static init


#ifndef on_tmr_dim
 #define on_tmr_dim() //initialize function chain
#endif

//NOTE: need macros here so "return" will exit caller
#define on_tmr_dim_check()  if (!TMR0IF) return

INLINE void on_tmr_dim_tick(void)
{
	on_tmr_dim(); //prev event handlers first
    LABDCL(0x01);
//use += to compensate for overruns:
    TMR0 += Timer0_Preset; //TimerPreset(100 usec, 6, Timer0, CLOCK_FREQ); // / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
}
#undef on_tmr_dim
#define on_tmr_dim()  on_tmr_dim_tick() //event handler function chain


//#ifndef on_tmr_1sec
// #define on_tmr_1sec() //initialize function chain
//#endif

//set Timer 0 preset to match ZC rate:
//check ZC once every second
INLINE void on_tmr_1sec_dim_preset(void)
{
	on_tmr_1sec(); //prev event handlers first
//	ONPAGE(LEAST_PAGE); //keep demo code separate from protocol and I/O so they will fit within first code page with no page selects
    WREG = TMR0_PRESET_DC50Hz;
//CAUTION: zc_60hz overrides zc_present; check in reverse order
    if (zc_present) WREG = TMR0_PRESET_AC50Hz;
	if (zc_60hz) WREG = TMR0_PRESET_AC60Hz;
    Timer0_Preset = WREG;
}
#undef on_tmr_1sec
#define on_tmr_1sec()  on_tmr_1sec_dim_preset() //event handler function chain


////////////////////////////////////////////////////////////////////////////////
////
/// Timer 1 (16 bits):
//

#ifndef Timer1_Range
 #define Timer1_Range  (50UL msec)
#endif
//#define Timer1_halfRange  (Timer1_Range / 2) //kludge: BoostC gets /0 error with 50 msec (probably 16-bit arith overflow), so use a smaller value
//#define Timer1_8thRange  (Timer1_Range / 8) //kludge: BoostC gets /0 error with 50 msec (probably 16-bit arith overflow), so use a smaller value

//#define TMR1_TICKS(usec)  (0 - TimerPreset(usec, 0, Timer1, CLOCK_FREQ))
#define TMR1_TICKS(usec)  ((usec) / (50UL msec)) //U16FIXUP(50 msec))
//#define Timer1_halfLimit  Instr2uSec(256 * 256 / 2 * Timer1_Prescalar, CLOCK_FREQ) //max duration for Timer 1; avoid arith overflow error in BoostC by dividing by 2
//#define Timer1_Limit  Instr2uSec(256 * 256 / 1000 * Timer1_Prescalar, CLOCK_FREQ / 1000) //max duration for Timer 1; avoid arith overflow error in BoostC by dividing by 2
//CAUTION: "256 * 256" doesn't work here but "65536" does
#define Timer1_Limit  Instr2uSec(0x10000 * Timer1_Prescalar, CLOCK_FREQ) //max duration for Timer 1; avoid arith overflow error in BoostC by dividing by 2
//#define Timer1_8thLimit  Instr2uSec(256 / 8 * 256 * Timer1_Prescalar, CLOCK_FREQ) //max duration for Timer 1; avoid arith overflow error in BoostC by dividing by 2


//kludge: use trial & error to select prescalar:
#define Timer1_Prescalar  1UL
#if Timer1_Limit < 1
 #warning RED_MSG "[ERROR] Timer1 limit arithmetic bad" TOSTR(Timer1_Limit)
#endif
//#if Timer1_8thLimit < 1
// #warning RED_MSG "[ERROR] Timer1 limit arithmetic bad" TOSTR(Timer1_8thLimit)
//#endif
//#warning BLUE_MSG "T1 limit @ "Timer1_Prescalar" ps = "Timer1_halfLimit""
//#if Timer1_halfLimit < 0
// #warning YELLOW_MSG "[WARNING] BoostC arithmetic overflow, trying work-around"
//#endif
#if Timer1_Limit < Timer1_Range //U16FIXUP(Timer1_Range)
 #undef Timer1_Prescalar
 #define Timer1_Prescalar  2UL
// #warning BLUE_MSG "T1 limit @ "Timer1_Prescalar" 2 ps = "Timer1_halfLimit""
 #if Timer1_Limit < Timer1_Range //U16FIXUP(Timer1_Range)
  #undef Timer1_Prescalar
  #define Timer1_Prescalar  4UL
//  #warning BLUE_MSG "T1 limit @ "Timer1_Prescalar" 4 ps = "Timer1_halfLimit""
  #if Timer1_Limit < Timer1_Range //U16FIXUP(Timer1_Range)
   #undef Timer1_Prescalar
   #define Timer1_Prescalar  8UL
//   #warning BLUE_MSG "T1 limit @ "Timer1_Prescalar" 8 ps = "Timer1_halfLimit""
   #if Timer1_Limit < Timer1_Range //U16FIXUP(Timer1_Range) //exceeded max prescalar here
    #error RED_MSG "[ERROR] Can't find a Timer1 prescalar to give " TOSTR(U16FIXUP(Timer1_Range)) " usec range; limit was " TOSTR(Timer1_Limit)""
   #endif
  #endif
 #endif
#endif

#if 0
#if Timer1_halfLimit == 256*256/2*8000/8000 //8 MIPS
 #define Timer1_limit_tostr  "65.536 msec" //"32.768 msec"
// #undef Timer1_halfLimit
// #define Timer1_halfLimit  32768 //kludge: avoid macro body problems or arithmetic errors in BoostC
#elif Timer1_halfLimit == 256*256/2*4000/5000 //5 MIPS
 #define Timer1_limit_tostr  "52.428 msec"
// #undef Timer1_halfLimit
// #define Timer1_halfLimit  52428 //kludge: avoid macro body problems or arithmetic errors in BoostC
#elif Timer1_halfLimit == 256*256/2*4000/4608 //4.6 MIPS
 #define Timer1_limit_tostr  "56.888 msec"
// #undef Timer1_halfLimit
// #define Timer1_halfLimit  65535 //kludge: BoostC treats 65536 as 0 *sometimes*
// #define Timer1_halfLimit  56888 //kludge: avoid macro body problems or arithmetic errors in BoostC
#elif Timer1_halfLimit < 1
 #error RED_MSG "[ERROR] Timer 1 limit arithmetic is broken"
#else
 #define Timer1_limit_tostr  Timer1_halfLimit "*2 msec"
#endif
//#endif
//#endif
//#endif
#endif

//#warning BLUE_MSG "[INFO] Timer 1 limit is 2*" TOSTR(Timer1_halfLimit) " with " TOSTR(Timer1_Prescalar) ":1 prescalar."

//volatile bit Timer1Wrap @adrsof(PIR1).TMR1IF; //timer 1 16-bit wrap-around
//volatile bit Timer1Enable @adrsof(T1CON).TMR1ON; //time 1 on/off
#define Timer1Wrap  TMR1IF //timer 1 16-bit wrap-around
#define Timer1Enable  TMR1ON //time 1 on/off

//associate timer regs with names:
#define Timer1_reg  TMR1L //tmr1L//_16
#define Timer1_ADDR  TMR1L_ADDR

//;T1CON (timer1 control) register (page 51, 53):
//;set this register once at startup only, except that Timer 1 is turned off/on briefly during preset (as recommended by Microchip)
#define MY_T1CON(clock)  \
(0 \
	| IIFNZ(FALSE, /*1<<TMR1GE*/ _TMR1GE) /*;timer 1 gate-enable off (timer 1 always on)*/ \
	| IIFNZ(FALSE, /*1<<T1OSCEN*/ _T1OSCEN) /*;LP osc disabled (timer 1 source = ext osc)*/ \
	| IIFNZ(DONT_CARE, /*1<<NOT_T1SYNC*/ _NOT_T1SYNC) /*;no sync with ext clock needed*/ \
	| /*(0<<TMR1CS0)*/ IIFNZ(FALSE, _TMR1CS0) /*;use system clock (config) always*/ \
	| /*(1<<TMR1ON)*/ _TMR1ON /*;timer 1 on*/ \
	| ((NumBits8(Timer1_Prescalar) - 1) /*<< T1CKPS0*/ * _T1CKPS0) /*;prescalar on timer 1 (page 53); <T1CKPS1, T1CKPS0> form a 2-bit binary value*/ \
)

//#warning TOSTR(TimerPreset(50 msec / 2, 8, Timer1, CLOCK_FREQ))
//#define TMR1_PRESET_50msec  (2 * TimerPreset(50 msec / 2, 8, Timer1, CLOCK_FREQ))
#define TMR1_PRESET_50msec  TimerPreset(/*U16FIXUP(50 msec)*/ 50UL msec, 8, Timer1, CLOCK_FREQ)
#warning BLUE_MSG "timer1 50 msec preset" TOSTR(TMR1_PRESET_50msec)
#define TMR1_PRESET_1msec  TimerPreset(/*U16FIXUP(1 msec)*/ 1UL msec, 8, Timer1, CLOCK_FREQ)
#warning BLUE_MSG "timer1 1 msec preset" TOSTR(TMR1_PRESET_1msec)
//with 8:1 prescalar, Timer 1 interval is 1 usec @ 8 MIPS, preset for 50 msec tick == 50,000 == 0x3cb0


#ifdef TIMER1_DEBUG //debug
 #ifndef debug
  #define debug() //define debug chain
 #endif
//define globals to shorten symbol names (local vars use function name as prefix):
    volatile AT_NONBANKED(0) uint8_t t1con_debug; //= MY_T1CON(CLOCK_FREQ / PLL);
    volatile AT_NONBANKED(0) uint16_t tmr1_preset_debug; //= TMR1_PRESET_50msec; //TimerPreset(50 msec / 2, 8, Timer1, CLOCK_FREQ); // / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
    volatile AT_NONBANKED(0) uint16_t tmr1_50msec_debug; //= 50 msec;
    volatile AT_NONBANKED(0) uint8_t tmr1_presbits_debug; //= NumBits8(Timer1_Prescalar);
    volatile AT_NONBANKED(0) uint8_t tmr1_prescalar_debug; //= Timer1_Prescalar;
    volatile AT_NONBANKED(0) uint32_t tmr1_limit1_debug; //= Timer1_Limit;
    volatile AT_NONBANKED(0) uint32_t tmr1_limit2_debug; //= Timer1_Limit;
    volatile AT_NONBANKED(0) uint32_t tmr1_limit3_debug; //= Timer1_Limit;
    volatile AT_NONBANKED(0) uint32_t tmr1_limit4_debug; //= Timer1_Limit;
//    volatile AT_NONBANKED(0) uint32_t tmr1_8thlimit_debug; //= Timer1_halfLimit;
    volatile AT_NONBANKED(0) uint32_t tmr1_ticks_test1_debug; //= TMR1_TICKS(ONE_SEC);
    volatile AT_NONBANKED(0) uint32_t tmr1_ticks_test2_debug; //= TMR1_TICKS(1000 msec / 60);
 INLINE void tmr_50msec_debug(void)
 {
    debug(); //incl prev debug first
//tmr1_ticks_test2_debug = Instr2uSec(8 * Timer1_Prescalar, CLOCK_FREQ); //max duration for Timer 1; avoid arith overflow error in BoostC by dividing by 2
    t1con_debug = MY_T1CON(CLOCK_FREQ / PLL); //should be 0x31 with 8:1 prescalar and timer enabled, 0x01 with 1:1 prescalar
    tmr1_preset_debug = TMR1_PRESET_50msec; //U16FIXUP(TMR1_PRESET_50msec); //should be ~ 65536 - 50000 == 0x3cb0 with 8:1 pre @ 8 MIPS
    tmr1_preset_debug = TMR1_PRESET_1msec; //U16FIXUP(TMR1_PRESET_50msec); //should be ~ 65536 - 50000 == 0x3cb0 with 8:1 pre @ 8 MIPS
    tmr1_50msec_debug = 50UL msec; //50,000 == 0xc350
    tmr1_presbits_debug = NumBits8(Timer1_Prescalar); //should be 4 (for prescalar 8)
    tmr1_prescalar_debug = Timer1_Prescalar; //should be 8 @ 8 MIPS, makes T1 tick == 1 usec for easier timing arithmetic
    tmr1_limit1_debug = Timer1_Range; //U16FIXUP(Timer1_Range); //50,000 == 0xc350
    tmr1_limit2_debug = Timer1_Limit; //65.5 msec @ 8 MIPS with prescalar 8; should be 0x10000
    tmr1_limit3_debug = Instr2uSec(256 * 256 * Timer1_Prescalar, CLOCK_FREQ); //CAUTION: need "UL" for sign extends; max duration for Timer 1; avoid arith overflow error in BoostC by dividing by 2
    tmr1_limit4_debug = Instr2uSec(0x10000 * Timer1_Prescalar, CLOCK_FREQ); //max duration for Timer 1; avoid arith overflow error in BoostC by dividing by 2
//    tmr1_limit_debug = Instr2uSec(65536 * 8, CLOCK_FREQ); //max duration for Timer 1; avoid arith overflow error in BoostC by dividing by 2
//    tmr1_8thlimit_debug = Timer1_8thLimit;
    tmr1_ticks_test1_debug = TMR1_TICKS(ONE_SEC);  //should be 20 == 0x14
    tmr1_ticks_test2_debug = TMR1_TICKS(280 msec); //should be 5 or 6 (5 * 50 msec < 280 msec < 6 * 50 msec)
 }
 #undef debug
 #define debug()  tmr_50msec_debug()
#endif


//restart current timer interval:
//NOTE: fractional interval will be lost
INLINE void TMR1_reset()
{
//	if (relative) TMR0 += Timer0_Preset; 
#ifdef on_tmr_50msec //favor 50 msec if caller wants it
    TMR1_16 = U16FIXUP(TMR1_PRESET_50msec); //avoid overflow; / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
#else //default 1 msec
    TMR1_16 = /*U16FIXUP*/ (TMR1_PRESET_1msec); //avoid overflow; / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
#endif
    TMR1IF = FALSE; //prevent false trigger first time; NOTE: data sheets say this must be cleared in software
}


//wait for Timer 1 to wrap:
//idler() can do other work while waiting
#define wait4tmr1(delay_usec, idler, cumulative)  \
{ \
    /*TODO: if (cumulative) TMR1_16 += preset; //for better total accuaracy*/ \
    TMR1_16 = TimerPreset(/*U16FIXUP(1 msec)*/ delay_usec, 8, Timer1, CLOCK_FREQ); /*start with fresh interval*/ \
    TMR1IF = FALSE; /*prevent false trigger first time; NOTE: data sheets say this must be cleared in software*/ \
    while (!TMR1IF) idler; \
}
//    /*while (!TMR1IF) idler; //gives "unreadable code" warnings in sdcc*/;
//    for (;;)
//    {
//        if (TMR1IF) break;
//        idler();
//        if (NEVER) break;
//    }


//volatile NONBANKED uint2x8_t elapsed_msec;
volatile NONBANKED uint8_t elapsed_msecL;
volatile NONBANKED uint8_t elapsed_msecH;

#ifndef init
 #define init() //initialize function chain
#endif

//;initialize timer 1:
INLINE void init_tmr1(void)
{
	init(); //prev init first
    LABDCL(0x10);
//    t1con = MY_T1CON;
//    TMR1_16 = U16FIXUP(TMR1_PRESET_50msec); //avoid overflow; / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
//    TMR1L = TimerPreset(50 msec / 2, 8, Timer1, CLOCK_FREQ) % 0x100; // / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
//    TMR1H = TimerPreset(50 msec / 2, 8, Timer1, CLOCK_FREQ) / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
//    TMR1IF = FALSE; //prevent false trigger first time; NOTE: data sheets say this must be cleared in software
    reset(TMR1);
//    TMR1_16 = 1; //wrap immediately so caller's event handler will initialize; will make elapsed_msec counter off by 1
	T1CON = MY_T1CON(CLOCK_FREQ / PLL); //configure + turn on Timer 1; should be 0x21 for 1:4 prescalar
//    elapsed_msec.as_uint16 = 0;
    elapsed_msecL = elapsed_msecH = 0;
//    loop_1sec = TMR1_LOOP_1sec;
}
#undef init
#define init()  init_tmr1() //function chain in lieu of static init


#ifndef on_tmr_50msec
 #define on_tmr_50msec() //initialize function chain
#endif

//NOTE: need macros here so "return" will exit caller
#define on_tmr_50msec_check()  if (!TMR1IF) return

INLINE void on_tmr_50msec_tick(void)
{
	on_tmr_50msec(); //prev event handlers first
    LABDCL(0x10);
	/*t1con.*/ TMR1ON = FALSE; /*for cumulative intervals, can't use Microchip workaround and must set low byte first, but then need a temp for _WREG variant; just disable timer during update for simplicity*/
//	WREG = TimerPreset(duration, IIF(time_base, 8, 6), which, CLOCK_FREQ) / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
//	if (time_base) tmr1H /*op_##time_base*/ += WREG; else tmr1H = WREG;
//SDCC uses temps here, so use explicit opcodes:
//    TMR1_16 += TMR1_PRESET_50msec; // / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
//    TMR1L += TMR1_PRESET_50msec % 0x100;
    WREG = TMR1_PRESET_50msec % 0x100; addwf(ASMREG(TMR1L)); //should be ~ 65536 - 50000 == 0x3cb0 with 8:1 pre @ 8 MIPS
    WREG = /*U16FIXUP*/ (TMR1_PRESET_50msec) / 0x100; addwfc(ASMREG(TMR1H));
//    TMR1L += TimerPreset(50 msec / 2, 8, Timer1, CLOCK_FREQ) % 0x100; // / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
//    if (CARRY) ++TMR1H;
//    TMR1H += TimerPreset(50 msec / 2, 8, Timer1, CLOCK_FREQ) / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
    TMR1IF = FALSE; //NOTE: data sheets say this must be cleared in software
	/*T1CON.*/ TMR1ON = TRUE; /*for cumulative intervals, can't use Microchip workaround and must set low byte first, but then need a temp for _WREG variant; just disable timer during update for simplicity*/
}
#undef on_tmr_50msec
#define on_tmr_50msec()  on_tmr_50msec_tick() //event handler function chain


#ifndef on_tmr_1msec
 #define on_tmr_1msec() //initialize function chain
#endif

//NOTE: need macros here so "return" will exit caller
#define on_tmr_1msec_check()  if (!TMR1IF) return

INLINE void on_tmr_1msec_tick(void)
{
	on_tmr_1msec(); //prev event handlers first
    LABDCL(0x10);
	/*t1con.*/ TMR1ON = FALSE; /*for cumulative intervals, can't use Microchip workaround and must set low byte first, but then need a temp for _WREG variant; just disable timer during update for simplicity*/
//	WREG = TimerPreset(duration, IIF(time_base, 8, 6), which, CLOCK_FREQ) / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
//	if (time_base) tmr1H /*op_##time_base*/ += WREG; else tmr1H = WREG;
//SDCC uses temps here, so use explicit opcodes:
//    TMR1_16 += TMR1_PRESET_50msec; // / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
//    TMR1L += TMR1_PRESET_50msec % 0x100;
    WREG = TMR1_PRESET_1msec % 0x100; addwf(ASMREG(TMR1L)); //should be ~ 65536 - 50000 == 0x3cb0 with 8:1 pre @ 8 MIPS
    WREG = /*U16FIXUP*/ (TMR1_PRESET_1msec) / 0x100; addwfc(ASMREG(TMR1H));
//    TMR1L += TimerPreset(50 msec / 2, 8, Timer1, CLOCK_FREQ) % 0x100; // / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
//    if (CARRY) ++TMR1H;
//    TMR1H += TimerPreset(50 msec / 2, 8, Timer1, CLOCK_FREQ) / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
    TMR1IF = FALSE; //NOTE: data sheets say this must be cleared in software
	/*T1CON.*/ TMR1ON = TRUE; /*for cumulative intervals, can't use Microchip workaround and must set low byte first, but then need a temp for _WREG variant; just disable timer during update for simplicity*/
//sdcc bad code:    ++elapsed_msec.as_uint16;
//sdcc bad code:    if (!++elapsed_msec.low) ++elapsed_msec.high;
    ++elapsed_msecL;
    if (ZERO) ++elapsed_msecH;
}
#undef on_tmr_1msec
#define on_tmr_1msec()  on_tmr_1msec_tick() //event handler function chain


#endif //ndef _TIMERS_H
//eof