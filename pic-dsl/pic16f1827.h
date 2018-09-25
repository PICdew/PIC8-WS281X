//h/w model for PIC16F1827:
//NOTE: this just defines minimal info for code get (memory and registers); static model only
//MSASM provides all other device-specific knowledge
//there is no run-time behavior modelled here (sim is out of scope)

#ifndef PIC16F1827_H
#define PIC16F1827_H


//#include "pic16x.h"
#include "pic8-hw.h"

//#define memlen(bank)  (bank.ends - bank.begins + 1)


//PIC16F1827:
//8-bit PIC, extended instr set
const PIC/*16F1827*/ = new PIC8X(
{
    device: "16F1827", //0x16F1827
//memory:
    gpramlen: 384,
    flashlen: 4 K, //0x1000
    eepromlen: 256,
    banks:
    {
        0: {begins: 0x20, ends: 0x70}, //80
        1: {begins: 0xA0, ends: 0xF0}, //80
        2: {begins: 0x120, ends: 0x170}, //80
        3: {begins: 0x1A0, ends: 0x1F0}, //80
        4: {begins: 0x220, ends: 0x250}, //48
        shared: {begins: 0x70, ends: 0x80}, //16
    },
    linear: {begins: 0x2000, get ends() { return 0x2000 + this.parent.gpramlen - memlen(this.parent.banks.shared); }, }, //NOTE: linear addressing excludes shared gpram
    pages:
    {
        0: {begins: 0, ends: 0x800}, //1K words (2K bytes)
        1: {begins: 0x800, ends: 0x1000}, //1K words (2K bytes)
    },
    flash: {begins: 0x8000, get ends() { return this.begins + this.parent.flashlen; }, },
    id: 0x8006, //device ID
    config: {begins: 0x8007, ends: 0x8008+1}, //2 words
    eeprom: {begins: 0xF000, ends: 0xF100}, //256 bytes
//clock:
    osc_def: 500 KHz, //NOTE: MF, not HF!
    max_extclk: 20 MHz,
    max_intosc: 8 MHz,
    max_freq: 32 MHz,
    PLL: 4, //4x int osc speed
//#ifdef CLOCK_FREQ
//    clock: CLOCK_FREQ,
//#endif
    get clock() { return this.max_freq; }, //default max speed
});


//register addresses:
//see datasheet for details
//use #defines to allow #if/#else/#endif conditional code
#define PIR1_ADDR  0x09
#define TMR1_ADDR  0x0c
#define TRISA_ADDR  0x91
#define PORTA_ADDR  0x11

//registers:
const TRISA = PIC.Reg({bits: 0x3f, addr: TRISA_ADDR, init: 0x3f}); //defaults hi-Z (Input)
const PORTA = PIC.Reg({bits: 0x3f, addr: PORTA_ADDR, init: 0});

//sub-registers (bit definitions):
const TRISA1 = TRISA.Bit(0x01);
const RA1 = PORTA.Bit(0x01);

const TMR1 = PIC.Reg({bits: 0xffff, addr: TMR1_ADDR});
const PIR1 = PIC.Reg({bits: 0xff, addr: PIR1_ADDR});
const T1IF = PIR1.Bit(0x04);

#endif //ndef PIC16F1827_H
//eof