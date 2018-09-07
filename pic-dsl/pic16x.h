//8-bit extended PIC model:

#ifndef PIC16X_H
#define PIC16X_H

#include "pic8-hw.h"


//PIC16X:
//8-bit PIC, extended instr set
//const PIC = MPU(
//function PIC(opts)
class PIC8X extends MPU
{
//    if (!(this instanceof PIC)) return new PIC(opts);
    constructor(opts)
    {
        super(Object.assign({}, //default options
        {
//memory pool:
            banks:
            {
                0: {begin: 0x20, end: 0x70},
                1: {begin: 0xA0, end: 0xF0},
                2: {begin: 0x120, end: 0x170},
                shared: {begin: 0x70, end: 0x80},
            },
            linear: {begin: 0x2000, get end() { return 0x2000 + this.memlen; }},
//            memlen: 384, //sanity check
            get memlen() { throw `caller must specify PIC8X mem len`.red_lt; },
//clock:
            osc_def: 500 KHz, //NOTE: MF, not HF!
            max_extclk: 32 MHz,
            max_intosc: 8 MHz,
            has_PLL: true,
        }, opts));
    }
}

#endif //ndef PIC16X_H
//eof