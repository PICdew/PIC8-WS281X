//h/w model for PIC16F1827:
//NOTE: this just defines minimal info for code get (memory and registers); static model only
//MSASM provides all other device-specific knowledge
//there is no run-time behavior modelled here (sim is out of scope)

#ifndef PIC16F1827_H
#define PIC16F1827_H


//#include "pic16x.h"
#include "pic8-hw.h"

#define memlen(type)  (type.last - type.first + 1)


//PIC16F1827:
//8-bit PIC, extended instr set
const PIC/*16F1827*/ = new PIC8X(
{
    device: "16F1827",
//memory:
    gpramlen: 384,
    flashlen: 4 K, //0x1000
    eepromlen: 256,
    banks:
    {
        0: {first: 0x20, last: 0x70-1}, //80
        1: {first: 0xA0, last: 0xF0-1}, //80
        2: {first: 0x120, last: 0x170-1}, //80
        3: {first: 0x1A0, last: 0x1F0-1}, //80
        4: {first: 0x220, last: 0x250-1}, //48
        shared: {first: 0x70, last: 0x80-1}, //16
    },
    linear: {first: 0x2000, get last() { return 0x2000 + this.gpramlen - memlen(this.banks.shared) - 1; }}, //NOTE: linear addressing excluded shared gpram
    pages:
    {
        0: {first: 0, last: 0x800-1}, //1K words (2K bytes)
        1: {first: 0x800, last: 0x1000-1}, //1K words (2K bytes)
    },
    flash: {begin: 0x8000, get end() { return this.flash.begin + this.flashlen}},
    id: 0x8006, //device ID
    config: {first: 0x8007, last: 0x8008},
    eeprom: {first: 0xF000, last: 0xF100-1}, //256 bytes
//clock:
    osc_def: 500 KHz, //NOTE: MF, not HF!
    max_extclk: 32 MHz,
    max_intosc: 8 MHz,
    has_PLL: true,
});


//registers:
//see datasheet for details
#define TRISA_ADDR  0x91
#define PORTA_ADDR  0x11

const TRISA = PIC.Reg({bits: 0x3f, addr: TRISA_ADDR, init: 0x3f}); //defaults hi-Z (Input)
const PORTA = PIC.Reg({bits: 0x3f, addr: PORTA_ADDR, init: 0});

//sub-registers (bit definitions):
const TRISA1 = TRISA.Bit(0x01);
const RA1 = PORTA.Bit(0x01);

const TMR1 = PIC.Reg({bits: 0xffff, addr: 0x0c});
const PIR1 = PIC.Reg({bits: 0xff, addr: 0x09});
const T1IF = PIR1.Bit(0x04);

#endif //ndef PIC16F1827_H
//eof