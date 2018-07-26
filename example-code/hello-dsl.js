#ifdef pic16f1827
// #define TRISA_ADDR  0x91
// #define PORTA_ADDR  0x11
 const TRISA = Register({bits: 0x3f, addr: 0x91, value: 0x3f});
 const PORTA = Register({bits: 0x3f, addr: 0x11, value: 0});
#endif

const TRISA1 = TRISA.BitOf(0x01);
const RA1 = PORTA.BitOf(0x01);

#define sec  *1000000

#warning `[INFO] TRISA addr = ${TRISA.addr}`

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
    const loop = Register({bits: loop_t, bank: none, value: rdiv(duration, MaxDelay(timer))); \
    wait_recurring(timer, rdiv(duration, rdiv(duration, MaxDelay(timer))), if (!--loop) break); /*rdiv again to correct for first rdiv*/ \
} \


function main()
{
    TRISA1 = 0; //output
    for (;;)
    {
        RA1 = !RA1;
        wait(1 sec);
        PORTA ^= MaskOf(RA1);
        wait(1 sec);
    }
}

//eof