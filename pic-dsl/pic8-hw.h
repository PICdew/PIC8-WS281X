//define PIC h/w model (reg defs, banks/pages, etc)

#ifndef PIC8_HW_H
#define PIC8_HW_H

//const util = require("util");


/////////////////////////////////////////////////////////////////////////////////
////
/// Static representation (h/w model):
//

//overall device (memory + clock):
//use function-style ctors to allow call without "new" or private scoped vars
//class MPU
function MPU(opts)
{
console.error("mpu here1");
    if (!(this instanceof MPU)) return new MPU(opts);
    var total = 0, seen = {}; //private
console.error("mpu here2");

    function constructor(opts)
    {
        this.opts = Object.assign({}, opts || {}); //shallow copy
console.error("mpu here3");
console.error(JSON.stringify(this.opts));
//console.error(`this is a ${typeof this}, ${this.constructor.name}, is MPU? ${this instanceof MPU}`);
//validate memory defs:
        for (var b in this.opts.banks || {})
        {
            const bank = this.opts.banks[b];
            this.chkbank(bank, `bank ${b}`);
        }
        this.chklen("total bank");
        if (this.opts.linear)
        {
            total = 0;
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
        if (total != this.opts.memlen) throw `MPU: ${desc} memory len ${total} != declared mem len ${this.opts.memlen}`.red_lt;
    }

    function chkbank(bank, name)
    {
//        isthis.call(this);
        if (name) bank.name = name;
        if (bank.end <= bank.begin) throw `MPU: bad ${bank.name} len (begin ${bank.begin}, end ${bank.end})`.red_lt;
        total += bank.end - bank.begin + 1;
        for (var o in seen)
        {
            if ((bank.begin >= seen[o].begin) && (bank.end <= seen[o].end)) throw `MPU: ${bank.name} (begin ${bank.begin}, end ${bank.end}) overlaps bank ${seen[o].name} (begin ${seen[o].begin}, end ${seen[o].end})`.red_lt;
            seen[bank.name] = bank;
        }
    }

    [constructor, chklen, chkbank].forEach((method) => { this[method.name] = method; }); //copy nested functions to instance object
    this.constructor(opts);
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

//macros:
#define MHz  *1000000
#define KHz  *1000


#endif //ndef PIC8_HW_H
//eof