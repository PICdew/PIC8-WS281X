
#define zTEST(...)  CHOOSER(__VA_ARGS__)(__VA_ARGS__) //, TEST_2ARGS, TEST_1ARG, TEST_0ARGS) (__VA_ARGS__)
#define xTEST(...)  CHOOSE_FROM_ARG_COUNT(, ##__VA_ARGS__, TEST_2ARGS, TEST_1ARG, TEST_0ARGS) (__VA_ARGS__) //, TEST_2ARGS, TEST_1ARG, TEST_0ARGS) (__VA_ARGS__)
//#define xTEST(...)  CHOOSE_FROM_ARG_COUNT(CONCAT(__VA_ARGS__ NO_ARG_EXPANDER), TEST_2ARGS, TEST_1ARG) (__VA_ARGS__)
#define NO_ARG_EXPANDER  ,,xTEST_00ARGS //if no args, expands to: NO_ARG_EXPANDER __VA_ARGS__ ()  // simply shrinks to NO_ARG_EXPANDER()
#define CHOOSER(...)  CHOOSE_FROM_ARG_COUNT(NO_ARG_EXPANDER LBLB __VA_ARGS__ (), TEST_2ARGS, TEST_1ARG) //NOTE: inner becomes valid macro if no args
#define CHOOSE_FROM_ARG_COUNT(x, one, two, three, ...)  one, two, three
#define xTEST(...)  CHOOSE_FROM_ARG_COUNT(NO_ARG_EXPANDER __VA_ARGS__, xTEST_2ARGS, xTEST_1ARG, xTEST_0ARGS) (__VA_ARGS__) //, TEST_2ARGS, TEST_1ARG, TEST_0ARGS) (__VA_ARGS__)

#define NOARGS(...)  __VA_ARGS__
#define TEST(...)  xTHIRD(NOARGS(barf ## __VA_ARGS__),,,)

#define FIRST(a, ...)  a
#define SECOND(a, b, ...)  b
#define THIRD(a, b, c, ...)  c
#define FOURTH(a, b, c, d, ...)  d

#define barf  ,,whazzit
#define COMMA  ,
//#define TEST(...)  ALLOW_2ARGS(CONCAT(__VA_ARGS__ NO_ARG_EXPANDER), TEST_2ARGS, TEST_1ARG, TEST_0ARGS) (__VA_ARGS__)
#define xTEST(...)  ALLOW_2ARGS(THING(__VA_ARGS__), TEST_2ARGS, TEST_1ARG, TEST_0ARGS) (__VA_ARGS__)
#define TEST_0ARGS()  TEST_1ARG(volatile uint8_t X = 1)
#define TEST_1ARG(a)  TEST_2ARGS(volatile uint8_t Y = 2, a)
#define TEST_2ARGS(a, b) { a; b; }

//    { volatile uint8_t Y = 2; ; };
//    { volatile uint8_t Y = 2; WREG = 0x11; };
//    { WREG = 0x22; WREG = 0x33; };

void main()
{
//    FIRST();
//    FIRST(1);
//    FIRST(1,2);

//    SECOND();
//    SECOND(1);
//    SECOND(1,2);

    TEST();
    TEST(WREG = 0x11);
    TEST(WREG = 0x22, WREG = 0x33);
}
