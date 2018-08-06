//h/w model for PIC16F1827:
//NOTE: this just defines minimal info for code get (memory and registers); static model only
//MSASM provides all other device-specific knowledge
//there is no run-time behavior modelled here (sim is out of scope)

#include "pic16x.h"

//PIC16F1827:
//registers:
//see datasheet for details
// #define TRISA_ADDR  0x91
// #define PORTA_ADDR  0x11
const TRISA = PIC.Reg({bits: 0x3f, addr: 0x91, value: 0x3f}); //defaults hi-Z (Input)
const PORTA = PIC.Reg({bits: 0x3f, addr: 0x11, value: 0});

//sub-registers (bit definitions):
const TRISA1 = TRISA.Bit(0x01);
const RA1 = PORTA.Bit(0x01);

const TMR1 = PIC.Reg({bits: 0xffff, addr: 0xc});
const PIR1 = PIC.Reg({bits: 0ff, addr: 0x9});
const T1IF = PIR1.Bit(0x04);

//eof