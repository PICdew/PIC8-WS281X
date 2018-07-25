//PIC8 WS281X break-out/adapter:
//Use an 8-bit Microchip PIC (8 MIPS) to decode WS281X data stream.
//Decoded stream can control DIYC SSRs (8 channels dedicated or 56 channels chipiplexed) or other WS281X data streams.

//History:
//0.2  DJ  12/8/17  move Ch*plexing encoder onto PIC
//0.3  DJ  6/24/18  finally got reworked includes + sdcc + asm fixup working
//0.4  DJ  7/16/18  rework input stream; use CCP1 + CCP3 + MSSP to decode WS281X as SPI instead of inverted USART as serial data (avoids need to compensate for start/stop bits)
//0.5  DJ  7/26/18  add breakout handler (display 24 bits of first node received)

//alternative approaches considered:
//- invert WS281X data and use PIC USART; must be faster than 800 Kbaud; jittery signal is tricky to decode (must accept frame errors as valid data)
//- Xilinx 9587 CPLD; run CPLD @50 MHz and break out WS281X data; run /opt/Xilinx/14.7/ISE_DS/run_ise.sh

//Serial in daisy chained from WS281X data line (800 KHz nominal, but forgiving).
//8 parallel out controlling AC or DC SSRs (dedicated or chipiplexed)
//This code makes use of the following IP:
//Adaptive ZC/DC detection (C) 2010-2017 djulien
//Super-PWM loop (C) 2010-2017 djulien
//ASM-fixup script (C) 2010-2018 djulien
//WS281X 5-8 MIPS PIC bit banging (C) 2014-2017 djulien
//Chipiplexing encoder (C) 2014-2017 djulien
//TODO: put complete history here, add this SDCC/WS281X transport rewrite

//NOTE: PIC UART could be used with inverted WS281X signal or fancy variable bit time starting logic, but SPI seems simpler
//PIC datasheet:
//SSPxCON1 r/w controls SPI opn, and SSPxSTAT 0xc0 r/w, 0x3f ro
//SSPxBUF contains rcvd byte, SSPxIF flag set
//SSPxCON1.SSPEN = 1 to enable, to reset/reconfig set SSPEN = 0, change, set SSPEN = 1
//need to set TRIS, ANSEL
//Msb first
//SSPxCON1.CKP = clock polarity
//INLVA/B?
//SSPxCON3?
//SSPxSTAT.SMP = 0; SSPxSTAT.CKE = 0;
//SSPxCON1.SSPEN = 1; SSPxCON1.CKP = 0; SSPxCON1.SSPM = 5;
//SSPxCON3.BOEN = 0?;

//detect:
//pk2cmd -p -i
//pk2cmd -?v
//to pgm:
//MPLAB build
//pk2cmd -PPIC16F688 -M -Y -Fbuild/EscapePhone.HEX
//testing:
//detect PK2 + device: pk2cmd -p -i
//run code: pk2cmd -PPIC16F88 [-A5] -T 
//reset: pk2cmd -PPIC16F688 -R
//1. code gen
//look at LST file and check for correct opcodes
//step thru code using MPSIM
//2. DFPlayer
//ground pin IO 2 to play successive sound files
//NOTE: connect DFPlayer RX to PIC TX; DF Player datasheet refers to DF Player's UART, not other device's
//CAUTION: rename files before copy to SD card; names must start with 4 digits (sequential), but can contain "_" and alphanumerics after that (no "-"s)
//3. serial port
//connect FTDI USB-to-serial cable from PC to PIC
//run "dmesg | grep tty" to show which port to use (Linux)
//lsusb | grep -i serial
//run "sudo stty -F /dev/ttyUSB0 -a" to show baud rate
//run "sudo putty" at 9600 baud and examine DF Player commands sent by PIC
//(optional: recompile code with PUTTY_DEBUG to get displayable chars)

//TODO:
//- SDCC expand macro values in warning/error messages
//- SDCC banksel BUG (non-banked check in pcode.c)
//- SDCC BUG: loses "volatile" on bit vars within structs
//- SDCC poor code gen, reduce temps, allow non-banked stack vars
//- SDCC better bank select optimization (track entry/exit banks)
//- U16FIXUP not needed with UL? (clock consts)

#define CLOCK_FREQ  (32 MHz) //8 MIPS; max osc freq (with PLL); PIC will use int osc if ext clock is absent
//#define CLOCK_FREQ  (4 MHz) //1 MIPS
//#define CLOCK_FREQ  18432000 //20 MHz is max ext clock freq for older PICs; comment this out to run at max int osc freq; PIC will use int osc if ext clock is absent
//#define Timer0_range  (100 usec)
//#define Timer1_halfRange  (50 msec/2) //kludge: BoostC gets /0 error with 50 msec (probably 16-bit arith overflow), so use a smaller value
//receive at 5/6 WS281X bit rate (which is 800 KHz); this gives 2 bytes per WS281X node (8 data bits + 1 start/stop bit per byte)
//#define BAUD_RATE  9600 //(8 MHz / 12) ///10 * 5/6) //no-needs to be a little faster than 3x WS281X data rate (2.4 MHz), or a multiple of it; this is just about the limit for an 8 MIPS PIC16X
// 2/3 Mbps => 15 usec/char; can rcv 2 bytes/WS281X node
//#define BAUD_RATE  (10 MHz) //needs to align with visual bit-banging from GPU; //be a little faster than 3x WS281X data rate (2.4 MHz); this is just about the limit for an 8 MIPS PIC16X
//#define REJECT_FRERRS //don't process frame errors (corrupted data could mess up display)
//#define NUMSLOTS  256 //256 dimming slots [0..255] (8 bits) ~= 32.5 usec per slot @ 60 Hz AC
//#define NUM_SSR  8 //#IO pins for chipiplexed/charlieplexed SSRs; 8 gives 8 * 7 == 56 channels
//#define ALL_OFF  0 //for active low (Common Anode) SSRs, use 0xFF or ~0; for active high (Common Cathode), use 0
//#define RGB_FMT  0x123 //set this to 0x213 if WS281X on front panel for R <-> G swap
//#define debug  //include compile-time value checking

//include compile-time value checking:
#define CALIBRATE_TIMER //timing test; NOTE: overrides all other options
#define WANT_BREAKOUT //display debug/status info on "front panel" made of 24 WS281X LEDs; NOTE: overrides all other options
//#define SERIAL_DEBUG
#define TIMER_DEBUG
//#define CLOCK_DEBUG
//#define SCAN_DEBUG
//#define MP3_TEST
//#define PUTTY_DEBUG


//#include <xc.h> //automatically selects correct device header defs
//#include "helpers.h"
#include "compiler.h"
//#include "clock.h" //override default clock rate
//#include "config.h"
//#include "timer_dim.h"
//#include "timer_50msec.h"
//#include "timer_msec.h"
//#include "timers.h"
#define wait_once(ignored)  nop()
//////////////#include "ws281x.h"
//#include "wdt.h" //TODO?
//#include "serial.h"
//#include "zc.h"
//#include "outports.h"

//no worky with sdcc: https://stackoverflow.com/questions/3046889/optional-parameters-with-c-macros :(
//this one: https://stackoverflow.com/questions/27049491/can-c-c-preprocessor-macros-have-default-parameter-values
//#define TEST(...)  MACRO_CHOOSER(__VA_ARGS__)(__VA_ARGS__) //, TEST_2ARGS, TEST_1ARG, TEST_0ARGS) (__VA_ARGS__)
#define xTEST(...)  CHOOSE_FROM_ARG_COUNT(CONCAT(__VA_ARGS__ NO_ARG_EXPANDER), TEST_2ARGS, TEST_1ARG) (__VA_ARGS__)
#define NO_ARG_EXPANDER  ,,TEST_0ARGS //if no args, expands to: NO_ARG_EXPANDER __VA_ARGS__ ()  // simply shrinks to NO_ARG_EXPANDER()
//#define MACRO_CHOOSER(...)  CHOOSE_FROM_ARG_COUNT(NO_ARG_EXPANDER ## __VA_ARGS__ (), TEST_2ARGS, TEST_1ARG) //NOTE: inner becomes valid macro if no args
#define CHOOSE_FROM_ARG_COUNT(one, two, three, ...)  three

#define COMMA  ,
//#define TEST(...)  ALLOW_2ARGS(CONCAT(__VA_ARGS__ NO_ARG_EXPANDER), TEST_2ARGS, TEST_1ARG, TEST_0ARGS) (__VA_ARGS__)
#define TEST(...)  ALLOW_2ARGS(THING(__VA_ARGS__), TEST_2ARGS, TEST_1ARG, TEST_0ARGS) (__VA_ARGS__)
#define TEST_0ARGS()  TEST_1ARG(volatile uint8_t X = 1)
#define TEST_1ARG(a)  TEST_2ARGS(volatile uint8_t Y = 2, a)
#define TEST_2ARGS(a, b) { a; b; }

//    { volatile uint8_t Y = 2; ; };
//    { volatile uint8_t Y = 2; WREG = 0x11; };
//    { WREG = 0x22; WREG = 0x33; };

void test()
{
    TEST();
    TEST(WREG = 0x11);
    TEST(WREG = 0x22, WREG = 0x33);
}
#undef init
#define init()  test()
/////////////////////////////////////////////////////////////////////////////////
////
/// Pin assignments:
//

//PIC16F1825 has 12 I/O pins, but 4 are needed for SPI data recovery which leaves only 7 pins for SSR control
//could have used an inverter (comparator) and USART, but that requires sender encoding to compensate for start/stop bits
//could have used a PIC12F1840 to recover SPI signal and PIC16F1825 for SSR channel control, but that's an extra IC
//I wanted 8 pins for SSR control (allowing 8x7 chipiplexing) and a single IC, so I used a PIC16F1827 instead

//PIC16F1827 pin-out/wiring:
//                  +----U----+
//             ch 2 | A2   A1 | ch 1
//             ch 3 | A3   A0 | ch 0
//             ch 4 | A4   A7 | ch 7
//           ZC/VPP | A5   A6 | ch 6
//              GND |VSS   VDD| +5V
// WS281X ----> T1G | B0   B7 | ICMP DAT
//        `---> SDI | B1   B6 | ICMP CLK
// LEDs <--- fr pan | B2   B5 | ch 5
//        +--- CCP1 | B3   B4 | SCLK <--+
//        |         +---------+         | (0.5 usec delay)
//        +-----------------------------+

//8 dedicated or chipiplexed channels:
//#define CH0_PIN  RA0
//#define _CH0_PIN  0xA0
//#define CH0_MASK  PORTMAP16(_CH0_PIN)
#define CH0_PIN  A0
#define CH1_PIN  A1
#define CH2_PIN  A2
#define CH3_PIN  A3
#define CH4_PIN  A4
#define CH5_PIN  B5 //CAUTION: moved to PORTB because RA5 is input-only (VPP/MCLR)
#define CH6_PIN  A6
#define CH7_PIN  A7

//ZC for AC SSRs:
#define ZC_PIN  A5 //reused VPP/MCLR since it's input-only
//#define _ZC_PIN  0xA5
//#define ZC_MASK  PORTMAP16(_ZC_PIN)

//ICMP pins:
//#define ICMP_VPP_PIN  RA5
//#define ICMP_DAT_PIN  RB7
//#define ICMP_CLK_PIN  RB6

//SPI pins:
#define SDI_PIN  B1 //aka MOSI
//#define _SDI_PIN  0xB1
//#define SDI_MASK  PORTMAP16(_SDI_PIN)
#define SCLK_PIN  B4
//#define _SCLK_PIN  0xB4
//#define SCLK_MASK  PORTMAP16(_SCLK_PIN)

//WS281X data stream recovery:
//delay SDI by 0.5 usec and use as SDI clock to recover SDI data
#define DELAYIN_PIN  B0 //use T1G to trigger 0.5 usec delay
//#define _DELAYIN_PIN  0xB0
//#define DELAYIN_MASK  PORTMAP16(_DELAYIN_PIN)
#define DELAYOUT_PIN  B3 //CCP1 has delayed SCLK
//#define _DELAYOUT_PIN  0xB3
//#define DELAYOUT_MASK  PORTMAP16(_DELAYOUT_PIN)

//that leaves 1 pin for debug/front panel LEDs:
//(actually, RB6 and RB7 are still available also)
#define FRPAN_PIN  B2
//#define _FRPAN_PIN  0xB2
//#define FRPAN_MASK  PORTMAP16(_FRPAN_PIN)


/////////////////////////////////////////////////////////////////////////////////
////
/// Misc timing:
//


//inline void on_tmr1_debounce()
//{
//    on_tmr1();
//}

//bkg event handler:
//void yield()
//{
//    on_tmr1(); //only need Timer 1 for debounce
//}


/////////////////////////////////////////////////////////////////////////////////
////
/// Front panel/debug:
//

//#ifdef WANT_FRPAN
INLINE void frpan_init()
{
    init(); //other init first
//set front panel/debug pin to Output:
//    TRISA &= ~Abits(FRPAN_MASK); //set front panel pin to Output
//    TRISBC &= ~BCbits(FRPAN_MASK);
//    TRIS[PORTOF(_FRPAN_PIN) >> 4] &= ~ 1 << PINOF(_FRPAN_PIN);
    TRISx(FRPAN_PIN) = 0; //set for Output
    LATx(FRPAN_PIN) = 0; //make sure it's low so WS281X will be ready to receive data
//    TRIS[0xA] &= ~ 4; //debug
//	init(); //do other init *after* TRIS init (to minimize side effects on external circuits); NOTE: no race conditions occur with cooperative event handling (no interrupts)
}
#undef init
#define init()  frpan_init() //event handler function chain
//#endif


////////////////////////////////////////////////////////////////////////////////
////
/// basic hardware tests (blink led, play mp3):
//

#ifdef CALIBRATE_TIMER
//NOTE: uses port_init() defined above
 #define LED_PIN  FRPAN_PIN
//#define _LED_PIN  _BUSY_PIN
//#define LED_MASK  BUSY_MASK //PORTMAP16(_LED_PIN)

//toggle LED @1 Hz:
//tests clock timing and overall hardware
 /*INLINE*/ void calibrate_init(void)
 {
    init(); //other init first
//	on_tmr_1sec(); //prev event handlers first
//    wait(1 sec);
    TRISx(LED_PIN) = 0; //set for Output
    for (;;)
    {
        wait_once(1 sec); //uses Timer 1 + 8-bit loop counter
//        nop();
//        if (LATx(LED_PIN)) LATx(LED_PIN) = 0; //NOTE: use LATx to avoid read-modify-write problems (in case heavy current on LED pin)
//        else LATx(LED_PIN) = 1;
//        LATx(LED_PIN) ^= 1 << LATxBIT(LED_PIN);
        WREG = 1 << LATxBIT(LED_PIN); xorwf(LATxADDR(LED_PIN));
        if (NEVER) break; //avoid "unreachable code" warning
    }
 }
// #undef on_tmr_1sec
// #define on_tmr_1sec()  led_1sec() //event handler function chain
 #undef init
 #define init()  calibrate_init() //event handler function chain
#endif //def CALIBRATE_TIMER


////////////////////////////////////////////////////////////////////////////////
////
/// ZC handler:
//


////////////////////////////////////////////////////////////////////////////////
////
/// SSR handler:
//

#if 0
#define AC  *2 //dimming occurs during each half cycle
#define Hz //dummy keyword for reabability
#define DC //dummy keyword for readability
non_inline ssr_refresh()
{
    for (;;)
    {
        wait(rdiv(1 sec / 256, 60 Hz AC), handler_chain()); //~32.5 usec for 2x60 Hz
//        wait(rdiv(1 sec / 256, 50 Hz AC), handler_chain()); //~39 usec for 2x50 Hz
//        wait(rdiv(1 sec / 256, 50 Hz DC), handler_chain()); //~78 usec for 50 Hz
        if (--evt_delay) continue; //not time to update yet
        TRISA = SSRAoff; //anti-ghosting
        TRISBC = SSRBCOFF;
        PORTA = ssrAbuf;
        PORTB = ssrBCbuf;
        TRISA = SSRAon;
        TRISBC = SSRBCon;
//TODO: get next vals
        ssrAbuf = 1;
        ssrBCbuf = 2;
        evt_delay = 3;
        return;
    }
}
#undef handler_chain
#define handler_chain()  ssr_refresh()


#define getSPIbyte(dest, timeout)  { waitSPIbyte_WREG(); dest = SSP1BUF; }
non_inline void waitSPIbyte_WREG()
{
    wait(50 usec, if (SSP1IF) return);
    ssr_refresh;
}
non_inline spi_handler()
{
}
#endif


////////////////////////////////////////////////////////////////////////////////
////
/// WS281X splitter:
//


NONBANKED volatile uint2x8_t wslen;


//send SPI bytes to channel 0:
#if 0
non_inline void split0()
{
//    TRISOF(_CH0_PIN) &= ~PINMASK(_CH0_PIN); //make sure pin is output
//    TRIS(CH0_PIN) = 0; //make sure pin is output (only needed first time; init was tristate for chipiplexing)
    PORTx(CH0_PIN) = 0; //reset pin and pre-set BANKSEL
    for (;;)
    {
        volatile UNBANKED uint8_t byte;
        getSPIbyte(byte, 50 usec, command());
        outWSbit(PORTx(CH0_PIN), byte & 0x80); //lsb first
        outWSbit(PORTx(CH0_PIN), byte & 0x40);
        outWSbit(PORTx(CH0_PIN), byte & 0x20);
        outWSbit(PORTx(CH0_PIN), byte & 0x10);
        outWSbit(PORTx(CH0_PIN), byte & 0x08);
        outWSbit(PORTx(CH0_PIN), byte & 0x04);
        outWSbit(PORTx(CH0_PIN), byte & 0x02);
        --wslen;
        outWSbit(PORTx(CH0_PIN), byte & 0x01);
    }
}
#endif


////////////////////////////////////////////////////////////////////////////////
////
/// Main logic:
//

//#include "func_chains.h" //finalize function chains; NOTE: this adds call/return/banksel overhead, but makes debug easier
//inline void bkg()
//{
//    ssr_refresh();
//}


//command dispatch:
//NOTE: wrapped as a function, but re-entrant and never returns (enter/exit via goto); leaves stack cluttered, but doesn't matter since stack will wrap when full anyway
non_inline void command()
{
#if 0
    volatile UNBANKED uint8_t cmd;
    getSPIbyte(cmd, 0, command());  //WS281X stream is 800 KHz (30 usec/24-bit node); each byte takes 10 usec (80 instr @ 8 MIPS); must poll >= 100 KHz
    if (cmd & 0x10) //splitter; no SSRs
    {
//            volatile UNBANKED uint8_t ch;
        getSPIbyte(wslen.high, 50 usec, command());
        getSPIbyte(wslen.low, 50 usec, command());
//            PCL += cmd & 0x0F; //which pin to redirect to
//            split0();
//            split1();
        switch (cmd & 0x0F) //which pin to redirect to
        {
            case 0: split0(); break;
            case 1: split1(); break;
        }
        continue;
    }
#endif
}

#ifndef debug
 #define debug()
#endif


//init + evt handler loop:
void main(void)
{
    volatile uint8_t var1;
    volatile uint16_t var2 = 2;
    volatile uint32_t var3;
//no    NUMBANKS(2); //reduce banksel overhead
//	ONPAGE(LEAST_PAGE); //put code where it will fit with no page selects
//    test();
    debug(); //incl debug info
	init(); //1-time set up of control regs, memory, etc.
//?    PORTA = PORTBC = 0;
//    for (;; eventh()) //main loop; needs to call event handler periodically
    for (;;)
    {
        ++var1;
        ++var2;
        ++var3;
        command();
//        --PCL;
//        on_tmr_dim();
//        on_tmr_50msec(); //CAUTION: must come before tmr_1sec()
//        on_tmr_1sec();
//        on_tmr_1msec(); //elapsed time counter (msec); TODO: move to yield()?
//these should probably come last (they use above timers):
//        on_rx();
//        on_zc_rise(); //PERF: best: 8 instr (1 usec), worst: 36 instr + I/O func (4.5 usec + 120+ usec)
//        on_zc_fall(); //PERF: best: 12 instr (1.5 usec), worst: 28 instr (3.5 usec)
    }
}

//eof