//define PIC h/w model (reg defs, banks/pages, etc)

#ifndef PIC8_HW_H
#define PIC8_HW_H

//const util = require("util");
//const JSON5 = require("JSON5");


/////////////////////////////////////////////////////////////////////////////////
////
/// Static representation (h/w model), no run-time sim:
//


//macros for readability:
#define MHz  *1000000
#define KHz  *1000
#define K  *1000

#define memlen(bank)  (bank.ends - bank.begins) //(bank.last - bank.first + 1)


//overall device (memory + clock):
//use function-style ctors to allow call without "new" or private scoped vars
//class MPU
function MPU(opts)
{
//console.error("mpu here1");
    if (!(this instanceof MPU)) return new MPU(opts);
    var total = 0, seen = {}; //private
//console.error("mpu here2");

    function constructor(opts)
    {
        this.opts = parentify(Object.assign({}, opts || {})); //shallow copy, add parent refs
        defaults.call(this);
//console.error("mpu here3");
//console.error(JSON.stringify(this.opts));
//console.error(`this is a ${typeof this}, ${this.constructor.name}, is MPU? ${this instanceof MPU}`);
//validate memory defs:
        for (var b in this.opts.banks || {})
//        Object.keys(this.opts.banks).forEach((b, inx, all) =>
        {
            const bank = this.opts.banks[b];
            this.chkbank(bank, isNaN(b)? b: `bank ${b}`);
        }//);
        this.chklen("total bank");
        if (this.opts.linear)
        {
            total = 0 + memlen(this.opts.banks.shared); //linear range excludes shared gp ram
            this.chkbank(this.opts.linear, "linear");
            this.chklen("linear");
        }
        this.chkclock();
//TODO: validate clock speed
    }

//    function isthis()
//    {
//        if (!(this instanceof MPU)) throw `bad this: ${JSON5.stringify(this)}`.red_lt;
//    }

    function chklen(desc)
    {
//        isthis.call(this);
        if (!this.opts.gpramlen || (total != this.opts.gpramlen)) throw `MPU: ${desc} memory len ${total} != declared mem len ${this.opts.gpramlen}`.red_lt;
    }

    function chkbank(bank, name)
    {
//debug(`chkbank(${name})`, JSON5.stringify(bank));
//        isthis.call(this);
        if (name) bank.name = name;
        if (bank.ends <= bank.begins) throw `MPU: bad ${bank.name} len (begins ${bank.begins.toString(16)}, ends ${bank.ends.toString(16)})`.red_lt;
        total += memlen(bank);
        for (var o in seen)
        {
            if ((bank.begins >= seen[o].begins) && (bank.ends <= seen[o].ends)) throw `MPU: ${bank.name} (begins ${bank.begins.toString(16)}, ends ${bank.ends.toString(16)}) overlaps bank ${seen[o].name} (begins ${seen[o].begins.toString(16)}, ends ${seen[o].ends.toString(16)})`.red_lt;
            seen[bank.name] = bank;
        }
    }

    function chkclock()
    {
        if (!this.opts.clock) throw "MPU: no clock freq specified".red_lt;
        debug(`TODO: check clock ${this.opts.clock}`.red_lt);
    }

    [constructor, chklen, chkbank, chkclock].forEach((method) => { this[method.name] = method; }); //copy nested functions to instance object
    this.constructor(opts);

    function defaults()
    {
        if (!this.opts.clock)
        {
            this.opts.clock = this.opts.clock || (this.opts.max_intosc || 8 MHz) * (this.opts.PLL || 1);
            warn(`setting clock to max freq ${this.opts.clock.toString().replace(/000000/, " MHz").replace(/000/, " KHz")}`);
        }
    }
}


//registers:
//use function-style ctors to allow call without "new" (allows parent to be passed in)
const Reg =
MPU.prototype.Reg =
function Reg(opts, parent)
{
    if (!(this instanceof Reg)) return new Reg(opts, parent || this);
//    this.opts = opts || {};
    if (!(parent instanceof MPU)) throw "Reg must have MPU parent".red_lt;
    this.opts = Object.assign({parent}, opts || {}); //shallow copy
//incorporate memory allocator directly into h/w model:
//this allows more efficient code gen later
    if (this.opts.addr) return; //memory already allocated
//allocate address
//TODO: stack frame vs. global scope
    if (this.opts.bank)
//        if (!this.opts.banks[this])
        throw "TODO: alloc from bank".red_lt;
}

//sub-registers:
//use function-style ctors to allow call without "new" (allows parent to be passed in)
const Bit =
Reg.prototype.Bit = 
function Bit(opts, parent)
{
//    throw "TODO check bit in reg".red_lt;
//    return new Register(Object.assign({}, this.opts, {bits}));
    if (!(this instanceof Bit)) return new Bit(opts, parent || this);
//    this.opts = opts || {};
    if (!(parent instanceof Reg)) throw "Bit must have Reg parent".red_lt;
    if (!isNaN(opts)) opts = {bits: opts};
    this.opts = Object.assign({parent}, opts || {}); //shallow copy
}
/* BROKEN
//https://github.com/devongovett/to-ast
Register.prototype.toAST = function()
{
    const retval =
    {
        type: "Register",
        addr: this.addr,
        bits: this.bits,
//        value: this.value, //no need for initial value?
    };
    return retval;
}
*/

class PIC8X extends MPU
{
    constructor(opts) { super(opts); }
};


#endif //ndef PIC8_HW_H
//eof