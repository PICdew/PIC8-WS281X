//h/w model for PIC16F1827:
//NOTE: this just defines minimal info for code get (memory and registers); static model only
//MSASM provides all other device-specific knowledge
//there is no run-time behavior modelled here (sim is out of scope)

#include "pic-hw.h"


//PIC16F1827:
const PIC = MPU(
{
//memory pool:
    banks:
    {
        0: {begin: 0x20, end: 0x70},
        1: {begin: 0xA0, end: 0xF0},
        2: {begin: 0x120, end: 0x170},
        shared: {begin: 0x70, end: 0x80},
    },
    linear: {begin: 0x2000, end: 0x2000 + this.memlen},
    memlen: 384, //sanity check
//clock:
    osc_def: 500 KHz, //NOTE: MF, not HF!
    max_extclk: 32 MHz,
    max_intosc: 8 MHz,
    has_PLL: true,
});

//registers:
//see datasheet for details
// #define TRISA_ADDR  0x91
// #define PORTA_ADDR  0x11
const TRISA = PIC.Reg({bits: 0x3f, addr: 0x91, value: 0x3f}); //defaults hi-Z (Input)
const PORTA = PIC.Reg({bits: 0x3f, addr: 0x11, value: 0});

//sub-registers (bit definitions):
const TRISA1 = TRISA.Bit(0x01);
const RA1 = PORTA.Bit(0x01);

//eof