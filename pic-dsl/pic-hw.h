//define PIC h/w model (reg defs, etc)

/////////////////////////////////////////////////////////////////////////////////
////
/// Static representation (h/w model):
//

//overall device (memory + clock):
//use function-stlye ctors to allow call without "new":
function MPU(opts)
{
    if (!(this instanceof MPU)) return new MPU(opts);
    this.opts = Object.assign({}, opts || {}); //shallow copy
//validate memory defs:
    var total = 0, seen = {};
    for (var b in this.opts.banks || {})
    {
        const bank = this.opts.banks[b];
        chkbank(bank, `bank ${b}`);
    }
    chklen("total bank");
    if (this.opts.linear)
    {
        total = 0;
        chkbank(this.opts.linear, "linear");
        chklen("linear");
    }
//TODO: validate clock speed

    function chklen(desc)
    {
        if (total != this.opts.memlen) throw `MPU: ${desc} memory len ${total} != declared mem len ${this.opts.memlen}`.red_lt;
    }
    function chkbank(bank, name)
    {
        if (name) bank.name = name;
        if (bank.end <= bank.begin) throw `MPU: bad ${bank.name} len (begin ${bank.begin}, end ${bank.end})`.red_lt;
        total += bank.end - bank.begin + 1;
        for (var o in seen)
        {
            if ((bank.begin >= seen[o].begin) && (bank.end <= seen[o].end)) throw `MPU: ${bank.name} (begin ${bank.begin}, end ${bank.end}) overlaps bank ${seen[o].name} (begin ${seen[o].begin}, end ${seen[o].end})`.red_lt;
            seen[bank.name] = bank;
        }
    }
}


//registers:
const Reg =
MPU.prototype.Reg =
function Reg(opts)
{
    if (!(this instanceof Reg)) return new Reg(opts);
    this.opts = opts || {};
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
Register.prototype.BitOf = function(bits)
{
    throw "TODO check bit in reg".red_lt;
    return new Register(Object.assign({}, this.opts, {bits}));
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

//eof