#ifndef _TIMERS_H
#define _TIMERS_H

#include "config.h" //in case not already included
#include "compiler.h" //device registers
#include "helpers.h" //U16FIXUP(), RED_MSG, IIF(), NumBits(), TOSTR()
#include "clock.h" //Instr2uSec()


////////////////////////////////////////////////////////////////////////////////
////
/// Generic timer calculations:
//

//ticks <-> duration:
#define TicksPerSec(clock, prescalar)  InstrPerSec((clock) / (prescalar))
#define TicksPerMsec(clock, prescalar)  InstrPerMsec((clock) / (prescalar))
#define TicksPerUsec(clock, prescalar)  InstrPerUsec((clock) / (prescalar))

#define Ticks2Sec(...)  ALLOW_2ARGS(__VA_ARGS__, Ticks2Sec_2ARGS, Ticks2Sec_1ARG) (__VA_ARGS__)
#define Ticks2Sec_2ARGS(ticks, prescalar)  Ticks2Sec_3ARGS(ticks, prescalar, CLOCK_FREQ)
#define Ticks2Sec_3ARGS(ticks, prescalar, clock)  Instr2Sec(ticks, (clock) / (prescalar))

#define Ticks2Msec(...)  ALLOW_3ARGS(__VA_ARGS__, Ticks2Msec_3ARGS, Ticks2Msec_2ARGS, missing_arg) (__VA_ARGS__)
#define Ticks2Msec_2ARGS(ticks, prescalar)  Ticks2Msec_3ARGS(ticks, prescalar, CLOCK_FREQ)
#define Ticks2Msec_3ARGS(ticks, prescalar, clock)  Instr2Msec(ticks, (clock) / (prescalar))

#define Ticks2Usec(...)  ALLOW_3ARGS(__VA_ARGS__, Ticks2Usec_3ARGS, Ticks2Usec_2ARGS, missing_arg) (__VA_ARGS__)
#define Ticks2Usec_2ARGS(ticks, prescalar)  Ticks2Usec_3ARGS(ticks, prescalar, CLOCK_FREQ)
#define Ticks2Usec_3ARGS(ticks, prescalar, clock)  Instr2Usec(ticks, (clock) / (prescalar))

#define Sec2Ticks(...)  ALLOW_3ARGS(__VA_ARGS__, Sec2Ticks_3ARGS, Sec2Ticks_2ARGS, missing_arg) (__VA_ARGS__)
#define Sec2Ticks_2ARGS(sec, prescalar)  Sec2Ticks_3ARGS(sec, prescalar, CLOCK_FREQ)
#define Sec2Ticks_3ARGS(sec, prescalar, clock)  InstrPerSec((sec) * (clock) / (prescalar))

#define Msec2Ticks(...)  ALLOW_3ARGS(__VA_ARGS__, Msec2Ticks_3ARGS, Msec2Ticks_2ARGS, missing_arg) (__VA_ARGS__)
#define Msec2Ticks_2ARGS(msec, prescalar)  Msec2Ticks_3ARGS(msec, prescalar, CLOCK_FREQ)
#define Msec2Ticks_3ARGS(msec, prescalar, clock)  InstrPerMsec((msec) * (clock) / (prescalar))

#define Usec2Ticks(...)  ALLOW_3ARGS(__VA_ARGS__, Usec2Ticks_3ARGS, Usec2Ticks_2ARGS, missing_arg) (__VA_ARGS__)
#define Usec2Ticks_2ARGS(usec, prescalar)  Usec2Ticks_3ARGS(usec, prescalar, CLOCK_FREQ)
#define Usec2Ticks_3ARGS(usec, prescalar, clock)  InstrPerUsec((usec) * (clock) / (prescalar))


//choose prescalar based on caller-specified target duration range:
//replaced trial & error iterative #defines with formula 7/22/2018
//NOTE: each timer must have *_MinPrescalar, *_MaxPrescalar, and *_Limit defined (determined by device hardware)
//TODO: if caller specified Prescalar, only use that value
#define Prescalar(...)  ALLOW_3ARGS(__VA_ARGS__, Prescalar_3ARGS, Prescalar_2ARGS, Prescalar_1ARG) (__VA_ARGS__)
#define Prescalar_1ARG(which)  Prescalar_2ARGS(which, which##_Range)
#define Prescalar_2ARGS(which, range)  Prescalar_3ARGS(which, range, CLOCK_FREQ)
#define Prescalar_3ARGS(which, range, clock)  (1 << (NumBits8(divup(range, /*1:1*/Instr2Usec(which##_Limit + 1, clock)))) - 1) //clock / 4 / limit >= range * presc
//#define Instr2Sec_2ARGS(instr, clock)  rdiv((instr) * INSTR_CYCLES, clock) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
//clock  clock/4/limit  interval  range  prescalar
//32MHz     31.25KHz     32 usec   50 usec   2
//                                30 usec    1
//                               300 usec    4
//#define Instr2uSec_2ARGS(instr, clock)  rdiv(1M * (instr) * INSTR_CYCLES, clock) //((instr) * ONE_MSEC / InstrPerMsec(clock)) //CAUTION: scaling down CLOCK_FREQ avoids arith overflow, but causes rounding errors
//                               0...32      1
//                               33..64      2
//                               65..128     3
//                               129..256    4
//#if NumBits8(InstrPerSec(CLOCK_FREQ) / LFINTOSC_FREQ) >= IntOsc_MaxPrescalar
//  NumBits8(divup(range, Instr2Usec(CONCAT(which, _Limit), clock))) //clock / 4 / limit >= range * presc


//max duration for a given prescalar:
//#define Timer0_Limit  Instr2uSec(256 * Timer0_Prescalar, CLOCK_FREQ) //max duration for Timer 0
//#define MaxDelay(which, count, clock)  Instr2Usec(count * Prescalar(which, , CLOCK_FREQ) //max duration for Timer 0
#define MaxDelay(...)  ALLOW_3ARGS(__VA_ARGS__, MaxDelay_3ARGS, MaxDelay_2ARGS, MaxDelay_1ARG) (__VA_ARGS__)
#define MaxDelay_1ARG(which)  Ticks2Usec(which##_Limit + 1, which##_MaxPrescalar) //Prescalar(which)) //MaxDelay_2ARGS(which, Prescalar(which))
#define MaxDelay_2ARGS(which, prescalar)  Ticks2Usec(which##_Limit + 1, prescalar) //MaxDelay_3ARGS(which, prescalar, CLOCK_FREQ)
#define MaxDelay_3ARGS(which, prescalar, clock)  Ticks2USec(which##_Limit + 1, prescalar, clock) //Instr2Usec(which##_Limit * (prescalar), clock)

//pre-set (#ticks) for a given interval:
#define Ticks(...)  ALLOW_4ARGS(__VA_ARGS__, Ticks_4ARGS, Ticks_3ARGS, Ticks_2ARGS, missing) (__VA_ARGS__)
//#define TMR0_TICKS(usec)  (0 - TimerPreset(usec, 0, Timer0, CLOCK_FREQ))
#define Ticks_2ARGS(which, duration)  Ticks_3ARGS(which, duration, Prescalar(which)) //Usec2Ticks(duration, Prescalar(which)) //Usec2Instr(duration, (clock) / (prescalar)) + overhead, CONCAT(which, _Prescalar)))
#define Ticks_3ARGS(which, duration, prescalar)  Ticks_4ARGS(which, duration, prescalar, CLOCK_FREQ) //Usec2Ticks(duration, prescalar) //Usec2Instr(duration, (clock) / (prescalar)) + overhead, CONCAT(which, _Prescalar)))
#define Ticks_4ARGS(which, duration, prescalar, clock)  IIF((duration) < 1000UL, Usec2Ticks(duration, prescalar, clock), Msec2Ticks(rdiv(duration, 1000UL), prescalar, clock)) //Usec2Instr(duration, (clock) / (prescalar)) + overhead, CONCAT(which, _Prescalar)))

//#define Timer0_Limit  Instr2uSec(256 * Timer0_Prescalar, CLOCK_FREQ) //max duration for Timer 0

//#define TimerPreset(...)  ALLOW_4ARGS(__VA_ARGS__, TimerPreset_4ARGS, TimerPreset_3ARGS, TimerPreset_2ARGS, missing) (__VA_ARGS__)
//#define TimerPreset_2ARGS(which, duration)  TimerPreset_3ARGS(which, duration, 0)
//#define TimerPreset_3ARGS(which, duration, overhead)  TimerPreset_4ARGS(which, duration, overhead, CLOCK_FREQ)
//#define TimerPreset_4ARGS(which, duration, overhead, clock)  (0 - rdiv(Usec2Instr(duration, clock) + overhead, CONCAT(which, _Prescalar)))


#ifdef TIMER_DEBUG //debug
 #ifndef debug
  #define debug() //define debug chain
 #endif
 #define Timer0_Range  (100UL usec) //want Timer 0 to be able to reach this
 #define Timer0_Limit  0xffUL //(1<<8) //8-bit timer
 #define Timer0_MinPrescalar  (1<<0) //(if PSA != 0)
 #define Timer0_MaxPrescalar  (1<<8) //256
 #define Timer1_Range  (50UL msec) //want Timer 1 to be able to reach this
 #define Timer1_Limit  0xffffUL //(1<<16) //16-bit timer
 #define Timer1_MinPrescalar  (1<<0)
 #define Timer1_MaxPrescalar  (1<<3) //8
 /*INLINE*/ void timing_debug(void)
 {
    volatile /*AT_NONBANKED(0)*/ uint32_t per1 = TicksPerSec(CLOCK_FREQ, 1); //8M == 0x7a,1200
    volatile /*AT_NONBANKED(0)*/ uint32_t per2 = TicksPerSec(CLOCK_FREQ, 256); //31,250 == 0x7a12
    volatile /*AT_NONBANKED(0)*/ uint32_t per3 = TicksPerSec(32 MHz, 8); //1M == 0xf,4240
    volatile /*AT_NONBANKED(0)*/ uint32_t usec1 = Ticks2Usec(1, 8); //1 usec @8 MIPS
    volatile /*AT_NONBANKED(0)*/ uint32_t usec2 = Ticks2Usec(1000, 8, 4 MHz); //8 msec == 0x1f40
    volatile /*AT_NONBANKED(0)*/ uint32_t usec3 = Ticks2Usec(1, 8, 4 MHz); //8 usec
    volatile /*AT_NONBANKED(0)*/ uint32_t msec1 = Ticks2Msec(1, 8, 4 MHz); //~0 msec
    volatile /*AT_NONBANKED(0)*/ uint32_t ticks1 = Msec2Ticks(50, 4); //100K == 0x1,86a0 @8 MIPS (with 4:1 prescalar)
    volatile /*AT_NONBANKED(0)*/ uint32_t ticks2 = Usec2Ticks(12, 8); //12 @8 MIPS (8:1 prescalar)
    volatile /*AT_NONBANKED(0)*/ uint32_t pre1 = Prescalar(Timer0); //4:1 @8 MIPS with target range 100 usec
    volatile /*AT_NONBANKED(0)*/ uint32_t pre2 = Prescalar(Timer0, 500 usec); //16:1 @8 MIPS with range 500 usec
//    volatile uint32_t limit1 = Timer1_Range; //50 msec
//    volatile uint32_t usec4 = Instr2Usec(Timer1_Limit + 1, CLOCK_FREQ); //8K
//    volatile uint32_t scaled = divup(Timer1_Range, Instr2Usec(Timer1_Limit + 1, CLOCK_FREQ)); //~6.125 => 7
//    volatile uint32_t numb = NumBits8(divup(Timer1_Range, Instr2Usec(Timer1_Limit + 1, CLOCK_FREQ))) - 1; //2
//#define Prescalar_3ARGS(which, range, clock)  (1 << NumBits8(divup(range, Instr2Usec(which##_Limit, clock)))) //clock / 4 / limit >= range * presc
    volatile /*AT_NONBANKED(0)*/ uint32_t pre3 = Prescalar(Timer1); //4:1 @8 MIPS with target range 50 msec
    volatile /*AT_NONBANKED(0)*/ uint32_t pre4 = Prescalar(Timer1, 250 msec); //16:1 @8 MIPS with range 250 msec
    volatile /*AT_NONBANKED(0)*/ uint32_t max1 = MaxDelay(Timer0); //~8 msec @8 MIPS with max prescalar 256:1; 128 usec @8 MIPS with target range 100 usec (4:1 prescalar)
    volatile /*AT_NONBANKED(0)*/ uint32_t max2 = MaxDelay(Timer1); //~65 msec @8 MIPS with max prescalar 8:1; 32 msec == 0x8000 @8 MIPS with target range 50 msec (4:1 prescalar)
    volatile /*AT_NONBANKED(0)*/ uint32_t ticks3 = Ticks(Timer0, 32 usec); //64 @8 MIPS with target range 100 usec (4:1 prescalar)
    volatile /*AT_NONBANKED(0)*/ uint32_t ticks4 = Ticks(Timer1, 8 msec); //16K == 0x3e80 @8 MIPS with target range 100 usec (4:1 prescalar)
    debug(); //incl other debug
 }
 #undef Timer0_Range
 #undef Timer0_Limit
 #undef Timer0_MinPrescalar
 #undef Timer0_MaxPrescalar
 #undef Timer1_Range
 #undef Timer1_Limit
 #undef Timer1_MinPrescalar
 #undef Timer1_MaxPrescalar
 #undef debug
 #define debug()  timing_debug()
#endif


////////////////////////////////////////////////////////////////////////////////
////
/// Generic timing functions:
//

//#define ChooseTimer(duration)  IIF((duration) <= MaxDelay(Timer0, Prescalar(Timer0, duration)), Timer0, )

#if 0
//wait for a timer to wrap:
//idler() does other work while waiting (cooperative multi-tasking); optional
#define wait4timer(...)  ALLOW_3ARGS(__VA_ARGS__, wait4timer_3ARGS, wait4timer_2ARGS, wait4timer_1ARG) (__VA_ARGS__)
#define wait4timer_1ARG(delay_usec)  wait4timer_2ARGS(delay_usec, ) //just busy wait; TODO: yield()?
#define wait4timer_2ARGS(delay_usec, idler)  wait4timer_3ARGS(delay_usec, idler, true) //just busy wait; TODO: yield()?
#define wait4timer_3ARGS(delay_usec, idler, auto_correct)  \
{ \
    if (!auto_correct) TMR0 = 0; /*start with fresh interval*/ \
    TMR0 += TimerPreset(/*U16FIXUP(1 msec)*/ delay_usec, 2, Timer0, CLOCK_FREQ); /*for better total accuaracy*/ \
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
#endif


//one-shot timer:
//doesn't return until complete
//NOTE: duration should be a const so preset can be calculated at compile time rather than run time!
//optional idler() does other work while waiting (allows cooperative multi-tasking)
#define wait_once(...)  ALLOW_3ARGS(__VA_ARGS__, wait_once_3ARGS, wait_once_2ARGS, wait_once_1ARG) (__VA_ARGS__)
#define wait_once_1ARG(duration)  wait_once_2ARGS(duration, ) //busy wait
//#define wait_once_2ARGS(timer, duration)  wait_once_3ARGS(timer, duration, ) //busy wait
#define wait_once_2ARGS(duration, idler)  /*choose timer + loop size*/ \
{ \
    if ((duration) <= MaxDelay(Timer0)) wait_once_3ARGS(Timer0, duration, idler); \
    else if ((duration) <= MaxDelay(Timer1)) wait_once_3ARGS(Timer1, duration, idler); \
    else if ((duration) <= 256 * MaxDelay(Timer0)) delay_loop(Timer0, BANK0 uint8_t, duration); /*max ~2 sec*/ \
    else if ((duration) <= 256 * MaxDelay(Timer1)) delay_loop(Timer1, BANK0 uint8_t, duration); /*max ~8 sec*/ \
    else if ((duration) <= 256 * 256 * MaxDelay(Timer0)) delay_loop(Timer0, BANK0 uint16_t, duration); /*max ~8 minutes*/ \
    else if ((duration) <= 256 * 256 * MaxDelay(Timer1)) delay_loop(Timer1, BANK0 uint16_t, duration); /*max ~32 minutes*/ \
    else error("out of range"); \
}
#define wait_once_3ARGS(timer, duration, idler)  \
{ \
    timer##_init(Prescalar(timer, duration), false);  /*reset prescalar to match duration (allows more flexibility)*/ \
    timer = 0 - Preset((duration) - Instr2Usec(5), Prescalar(timer, duration)); \
    timer##_wrap = FALSE; /*prevent false trigger first time; NOTE: data sheets say this must be cleared in software*/ \
    while (!timer##_wrap) idler; \
}

//use delay loop to increase timer limit:
#define delay_loop(timer, loop_t, duration)  \
{ \
    volatile loop_t loop = rdiv(duration, MaxDelay(timer)); \
    wait_recurring(timer, rdiv(duration, rdiv(duration, MaxDelay(timer))), if (!--loop) break); /*rdiv again to correct for first rdiv*/ \
} \


//recurring timer:
//CAUTION: never returns; execution continues only via callback function; net result is a background timer thread (via callback function)
//NOTE: duration should be a const so preset can be calculated at compile time rather than run time!
//optional idler() does other work while waiting (allows cooperative multi-tasking)
#define wait_recurring(...)  ALLOW_4ARGS(__VA_ARGS__, wait_recurring_4ARGS, wait_recurring_3ARGS, missing_arg, missing_arg) (__VA_ARGS__)
#define wait_recurring_3ARGS(timer, interval_usec, callback)  wait_recurring_4ARGS(timer, interval_usec, callback, ) //busy wait
#define wait_recurring_4ARGS(timer, interval_usec, callback, idler)  \
{ \
    timer##_init(Prescalar(timer, interval_usec));  /*reset prescalar to match duration (allows more flexibility); start with full interval first time*/ \
    for (;;) \
    { \
        timer += 0 - Preset((interval_usec) - Instr2Usec(8), Prescalar(timer, interval_usec)); /*start next interval; compensate for timing inaccuracies*/ \
        timer##_wrap = FALSE; /*prevent false trigger first time; NOTE: data sheets say this must be cleared in software*/ \
        while (!timer##_wrap) idler; \
        callback(); \
    } \
}

#if 0
//wait specified #usec:
//NOTE: duration should be a const so preset can be calculated at compile time rather than run time!
//    TMR1_16 = U16FIXUP(TMR1_PRESET_1msec); //avoid overflow; / 0x100; /*BoostC sets LSB first, which might wrap while setting MSB; explicitly set LSB first here to avoid premature wrap*/
#define wait(...)  ALLOW_3ARGS(__VA_ARGS__, wait_3ARGS, wait_2ARGS, wait_1ARG) (__VA_ARGS__)
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
#endif


////////////////////////////////////////////////////////////////////////////////
////
/// Timer 0 (8 bits):
//

#ifndef Timer0_Range
 #define Timer0_Range  (100UL usec) //want Timer 0 to be able to reach this
#endif

#ifndef Timer0_Limit
 #define Timer0_Limit  0xff //(1<<8) //8-bit timer
#endif

#ifndef Timer0_MinPrescalar
 #define Timer0_MinPrescalar  (1<<0) //(if PSA != 0)
#endif

#ifndef Timer0_MaxPrescalar
 #define Timer0_MaxPrescalar  (1<<8) //256
#endif

#if 0
//#define TMR0_TICKS(usec)  (0 - TimerPreset(usec, 0, Timer0, CLOCK_FREQ))
//#define Timer0_Limit  Instr2uSec(256 * Timer0_Prescalar, CLOCK_FREQ) //max duration for Timer 0

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
#if Timer0_Limit < Timer0_range //out of range; use larger prescalar
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
#endif


#define Timer0_Prescalar  Prescalar(Timer0)
#warning BLUE_MSG "[INFO] Timer 0 limit is " TOSTR(Timer0_Limit) " with " TOSTR(Timer0_Prescalar) ":1 prescalar."
#if (Timer0_Prescalar < Timer0_MinPrescalar) || (Timer0_Prescalar > Timer0_MaxPrescalar)
 #error "[ERROR] Timer0 prescalar " TOSTR(Timer0_Prescalar) " out of range " TOSTR(Timer0_MinPrescalar) ".." TOSTR(Timer0_MaxPrescalar)
#endif


//associate timer regs with generic names:
#define Timer0_reg  TMR0 //tmr0
#define Timer0_ADDR  TMR0_ADDR
//volatile bit Timer0Wrap @adrsof(INTCON).T0IF; //timer 0 8-bit wrap-around
#define Timer0_Wrap  T0IF //Timer 0 8-bit wrap-around


//OPTIONS reg configuration:
//Turns misc control bits on/off, and set prescalar as determined above.
#define MY_OPTIONS(...)  ALLOW_1ARG(__VA_ARGS__, MY_OPTIONS_1ARG, MY_OPTIONS_0ARGS) (__VA_ARGS__)
#define MY_OPTIONS_0ARGS() MY_OPTIONS_1ARG(Timer0_Prescalar) //Prescalar(Timer0, Timer0_Range))
#define MY_OPTIONS_1ARG(prescalar)  \
(0 \
	| IIFNZ(FALSE, /*1<<NOT_WPUEN*/ _NOT_WPUEN) /*;enable weak pull-ups on PORTA (needed to pull ZC high when open); might mess up charlieplexing, so turn off for other pins*/ \
	| IIFNZ(DONT_CARE, /*1<<T0SE*/ _T0SE) /*;Timer 0 source edge: don't care*/ \
	| IIFNZ(DONT_CARE, /*1<<INTEDG*/ _INTEDG) /*;Ext interrupt not used*/ \
	| IIFNZ(/*Timer0_Prescalar*/ (prescalar) < 2, /*1<<PSA*/ _PSA) /*;FALSE => pre-scalar assigned to timer 0, TRUE => WDT*/ \
	| IIFNZ(FALSE, /*1<<T0CS*/ _T0CS) /*FALSE: Timer 0 clock source = (FOSC/4), TRUE: T0CKI pin*/ \
	| (MAX(NumBits8(/*Timer0_Prescalar*/ prescalar) - 2, 0) /*<< PS0*/ * _PS0) /*;prescalar value log2*/ \
)


#if 0
#ifndef NUMSLOTS
 #define NUMSLOTS  256UL
#endif

//Timer 0 presets:
#define DIMSLICE  rdiv(1 sec, NUMSLOTS /*?? +6*/) //timeslice to use for 255 dimming levels at given rate
#define EVENT_OVERHEAD  2 //20 //approx #instr to flush display event and start next dimming timeslot; all prep overhead occurs before start of timeslot to reduce latency and jitter
#define TMR0_PRESET_DC50Hz  TimerPreset(rdiv(DIMSLICE, 50), EVENT_OVERHEAD, Timer0, CLOCK_FREQ) //should be ~ 86 usec
#define TMR0_PRESET_AC50Hz  TimerPreset(rdiv(DIMSLICE, 2 * 50), EVENT_OVERHEAD, Timer0, CLOCK_FREQ) //should be ~ 43 usec
#define TMR0_PRESET_AC60Hz  TimerPreset(rdiv(DIMSLICE, 2 * 60), EVENT_OVERHEAD, Timer0, CLOCK_FREQ) //should be ~ 32 usec
volatile BANK0 uint8_t Timer0_Preset;
//with 4:1 prescalar, Timer 0 interval is 0.5 usec @ 8 MIPS, preset for 30 usec tick ~= 60
#endif


#ifdef TIMER_DEBUG //debug
 #ifndef debug
  #define debug() //define debug chain
 #endif
 INLINE void tmr0_debug(void)
 {
    volatile uint8_t optreg1 = MY_OPTIONS(); // / PLL);
    volatile uint8_t optreg2 = MY_OPTIONS(Prescalar(Timer0, 8 MHz);
//    volatile uint16_t tmr0_dimslice_debug = DIMSLICE;
//    volatile uint16_t preset_50dc = TMR0_PRESET_DC50Hz; //should be ~ 100 (156 * 0.5 usec * 50 Hz * 256 ~= 1 sec
//    volatile uint16_t preset_50ac = TMR0_PRESET_AC50Hz; //should be ~ 178 (78 * 0.5 usec * 2*50 Hz * 256 ~= 1 sec
//    volatile uint16_t preset_60ac = TMR0_PRESET_AC60Hz; //should be ~ 191 (65 * 0.5 usec * 2*60 Hz * 256 ~= 1 sec
    volatile uint8_t presbits = NumBits8(Timer0_Prescalar);
    volatile uint8_t prescalar = Timer0_Prescalar; //4:1 @8 MIPS with target range 100 usec
    volatile uint16_t limit = Timer0_Limit;
    volatile uint16_t ticks1 = Ticks(Timer0, 30 usec); //should be 60 with 4:1 prescalar @8 MIPS
    volatile uint16_t ticks2 = Ticks(Timer0, 100 usec); //should be 200
    debug(); //incl other debug
 }
 #undef debug
 #define debug()  tmr0_debug()
#endif


#define Timer0_init(...)  ALLOW_2ARGS(__VA_ARGS__, Timer0_init_2ARGS, Timer0_init_1ARG, Timer0_init_0ARGS) (__VA_ARGS__)
#define Timer0_init_0ARGS() Timer0_init_1ARG(Timer0_Prescalar) //Prescalar(Timer0, Timer0_Range))
#define Timer0_init_1ARG(prescalar)  Timer0_init_2ARGS(prescalar, true)
#define Timer0_init_2ARGS(prescalar, want_zero)  \
{ \
	OPTION_REG = MY_OPTIONS(prescalar /*CLOCK_FREQ / PLL*/); /*should be 0x00 for 1:2 prescalar or 0x01 for 1:4 prescalar (0x80/0x81 if no WPU)*/ \
    if (want_zero) Timer0 = 0; \
}
#if 0
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
//idler() does other work while waiting (cooperative multi-tasking); optional
#define wait4tmr0(...)  ALLOW_3ARGS(__VA_ARGS__, wait_3ARGS, wait_2ARGS, wait_1ARG) (__VA_ARGS__)
#define wait4tmr0_1ARG(delay_usec)  wait4tmr0_2ARGS(delay_usec, ) //just busy wait; TODO: yield()?
#define wait4tmr0_2ARGS(delay_usec, idler)  wait4tmr0_3ARGS(delay_usec, idler, true) //just busy wait; TODO: yield()?
#define wait4tmr0_3ARGS(delay_usec, idler, auto_correct)  \
{ \
    if (!auto_correct) TMR0 = 0; /*start with fresh interval*/ \
    TMR0 += TimerPreset(/*U16FIXUP(1 msec)*/ delay_usec, 2, Timer0, CLOCK_FREQ); /*for better total accuaracy*/ \
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
//    LABDCL(0x00);
//    Timer0_Preset = TMR0_PRESET_DC50Hz; //assume 50 Hz DC until ZC detected
	OPTION_REG = MY_OPTIONS(CLOCK_FREQ / PLL); /*should be 0x00 for 1:2 prescalar or 0x01 for 1:4 prescalar (0x80/0x81 if no WPU)*/
//    intcon = MY_INTCON;
}
#undef init
#define init()  init_tmr0() //function chain in lieu of static init


#if 0
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
#endif
#endif


////////////////////////////////////////////////////////////////////////////////
////
/// Timer 1 (16 bits):
//

#ifndef Timer1_Range
 #define Timer1_Range  (50UL msec) //want Timer 1 to be able to reach this
#endif
//#define Timer1_halfRange  (Timer1_Range / 2) //kludge: BoostC gets /0 error with 50 msec (probably 16-bit arith overflow), so use a smaller value
//#define Timer1_8thRange  (Timer1_Range / 8) //kludge: BoostC gets /0 error with 50 msec (probably 16-bit arith overflow), so use a smaller value

#ifndef Timer1_Limit
 #define Timer1_Limit  0xffff //(1<<16) //16-bit timer
#endif

#ifndef Timer1_MinPrescalar
 #define Timer1_MinPrescalar  (1<<0)
#endif

#ifndef Timer1_MaxPrescalar
 #define Timer1_MaxPrescalar  (1<<3) //8
#endif

#if 0
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
#endif


#endif //ndef _TIMERS_H
//eof