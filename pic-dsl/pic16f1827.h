//h/w model for PIC16F1827:
//NOTE: this just defines minimal info for code get (memory and registers); static model only
//MSASM provides all other device-specific knowledge
//there is no run-time behavior modelled here (sim is out of scope)

#ifndef PIC16F1827_H
#define PIC16F1827_H


#include "pic16x.h"

const PIC/*16F1827*/ = new PIC8X({memlen: 386, device: "16F1827"});

//PIC16F1827:
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