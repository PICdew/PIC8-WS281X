@echo off
rem shim BAT from MPLAB in Wine to sdcc in Ubuntu
rem NOTE: MPLAB custom pre-build step invokes this BAT file and passes in vars; MPWASM is still used, which allows MPSIM to be used in Wine as well; external Makefile doesn't allow MPSIM to be used
rem look in MPLAB IDE/Core/MPProject.dll to get names of project vars that can be passed in from MPLAB
rem set RECOMP=rem
rem set DEVICE=PIC12F1840
rem set DEVICE=PIC16F688
rem set DEVICE=PIC16F1825
rem NOTE: these are passed in via custom build line in MPLAB project:
set DEVICE=%1
rem set BASENAME=RenXt
set BASENAME=%3
set BASENAME=%BASENAME:.cof=%
set OUTDIR=%4
set OUTDIR=%OUTDIR:\=/%
rem echo outdir %OUTDIR%
rem echo basename %BASENAME%
rem set INFILE=debug\%BASENAME%.asm
rem set OUTFILE=debug\%BASENAME%_c2asm.asm
rem set UNPCLFILE=debug\NP-unpcl_c2asm.asm
rem set AWK=%~dp0\gawk401.exe
rem set CCDIR=C:\Program Files (x86)\SourceBoost
rem set CC=%CCDIR%\boostc_pic16.exe
rem set LD=%CCDIR%\boostlink_pic.exe
rem %~d0
rem cd %~dp0
rem set CWD=%cd%\
set CWD=%~dp0
echo Running %~n0 at %CWD% with %DEVICE% (%2 phase) ...

rem set /p WANTDEVICE=Which device ([%DEVICE%])?
rem if "%WANTDEVICE%" neq ""  set DEVICE=%WANTDEVICE%
rem set DEVICE=%DEVICE:a=A:b=B:c=C%
rem echo %DEVICE%
rem set DEVICE=%DEVICE:A=a:B=b:C=c:F=f%
set DEVICE=%DEVICE:C=c%
set DEVICE=%DEVICE:F=f%
set DEVICE=%DEVICE:L=l%
set DEVICE=%DEVICE:PIC=%
rem echo %DEVICE%
rem if "%DEVICE:~0,3%" neq "PIC"  set DEVICE=PIC%DEVICE%
rem set /p WANTDEBUG=Debug (y/[n])?
rem if "%WANTDEBUG:~0,1%" eq "y"  set CFLAGS=%CFLAGS% -d _DEBUG
rem if "%WANTDEBUG:~0,1%" eq "Y"  set CFLAGS=%CFLAGS% -d _DEBUG
rem ?set CFLAGS=%CFLAGS% -d _DEBUG
rem just use MPASM from within MPLAB now
rem :preproc
rem if "x%2" == "xpost"  goto postproc
rem make DEVICE=%1 TARGET=%2
rem goto done
rem equiv to Makefile:
set CCDIR=i:\usr\local\bin
set CC=%CCDIR%\sdcc
rem NOTE: requires ln -s sdcc sdcc.exe
rem %CC% -v
set INCLUDES=-Iincludes  -I/usr/local/bin/../share/sdcc/non-free/include
set CFLAGS=-mpic14 -p%DEVICE% --debug-xtra --no-xinit-opt --opt-code-speed --fomit-frame-pointer --use-non-free
rem use below line to see preprocessed source:
rem set CFLAGS=%CFLAGS% -E
rem set SOURCE = $(@F:.asm=.c)
rem set BASENAME=EscapePhone
rem set SOURCE=%BASENAME%.c 
rem set TEMPASM = $(@:.asm=-ugly.asm)
rem set ERROUT = $(@:.asm=.out)
rem set ERROUT=build/%BASENAME%.err
rem pushd %CWD%..
rem wineconsole cmd
cd /d %CWD%..
rem dir %SOURCE%
rem @echo Y | del build\*.*
rem @echo " "
rem echo Back up previous .asm + .hex + .lst files
@echo Y | move %OUTDIR%%BASENAME%.asm  %OUTDIR%%BASENAME%-bk.asm
@echo Y | move %OUTDIR%%BASENAME%.HEX  %OUTDIR%%BASENAME%-bk.HEX
@echo Y | move %OUTDIR%%BASENAME%.LST  %OUTDIR%%BASENAME%-bk.LST
rem move  build\%BASENAME%.asm  build\%BASENAME%-ugly.asm 
rem
rem need dummy file to satisfy MPLAB; create one in case sdcc fails:
rem echo hi > build\%BASENAME%.asm
rem time
rem %CC% -S -V %CFLAGS% %INCLUDES%  %BASENAME%.c  -o build/%BASENAME%-ugly.asm  2>build/%BASENAME%.err
echo on
%CC% -S -V %CFLAGS% %INCLUDES%  %BASENAME%.c  -o %OUTDIR%%BASENAME%-ugly.asm
@echo off
rem kludge: wait 5 sec to prevent next command from running before sdcc is finished:
ping 127.0.0.1 -n 6 > nul
rem dir build
if not exist %OUTDIR%%BASENAME%-ugly.asm  goto done
rem scripts\asm-fixup-SDCC.js  < build\%BASENAME%-ugly.asm  > build\%BASENAME%-fixup.asm
echo on
scripts\asm-fixup-SDCC.js  < %OUTDIR%%BASENAME%-ugly.asm  > %OUTDIR%%BASENAME%.asm
@echo off
rem cat build/%BASENAME%-fixup.asm | grep -v "^\s*;" | sed 's/;;.*$$//' > build\%BASENAME%.asm
goto done
rem %RECOMP% "%CC%"  -t %DEVICE%  -obj "%CWD%Debug"  %CFLAGS%  "%CWD%%BASENAME%.c"
rem goto done
rem %RECOMP% "%LD%"  -ld "%CCDIR%\lib"  "libc.pic16.lib"  -t %DEVICE%  -d "%CWD%Debug"  -p %BASENAME%  "%CWD%Debug\%BASENAME%.obj"
rem "%AWK%"  -v CWD="%CWD:\=\\%debug\\"  -f "%CWD%RenXtFixup.awk"  "%CWD%%INFILE%"  >  "%CWD%%OUTFILE:.asm=x.asm%"
rem "%AWK%"  -f "%CWD%casm-unpcl.awk"  "%CWD%%OUTFILE:.asm=x.asm%"  >  "%CWD%%UNPCLFILE%"
rem avoid file caching problem?
rem copy  "%CWD%%OUTFILE:.asm=x.asm%"  "%CWD%%OUTFILE%"
rem if exist "%CWD%Debug\%BASENAME%.hex"  del "%CWD%Debug\%BASENAME%.hex"
rem goto done

rem :postproc
rem set SAVEFILE=%OUTFILE:_c2asm=%
rem @echo on
rem if not exist "%CWD%%SAVEFILE:.lst=%(%DEVICE%).lst"  goto noprev
rem echo Backed up previous .hex + .lst
rem copy "%CWD%%SAVEFILE:.asm=%(%DEVICE%).hex"  "%CWD%%SAVEFILE:.asm=%(%DEVICE%)-bk.hex"
rem copy "%CWD%%SAVEFILE:.lst=%(%DEVICE%).lst"  "%CWD%%SAVEFILE:.lst=%(%DEVICE%)-bk.lst"
rem :noprev
rem copy "%CWD%%OUTFILE:.asm=.hex%"  "%CWD%%SAVEFILE:.asm=%(%DEVICE%).hex"
rem "%AWK%"  -f "%CWD%undate.awk"  "%CWD%%OUTFILE:.asm=.lst%"  >  "%CWD%%SAVEFILE:.asm=%(%DEVICE%).lst"
rem "%AWK%"  -f "%CWD%lst_summary.awk"  "%CWD%%OUTFILE:.asm=.lst%"

:done
rem if "x%RECOMP%" neq "x"  echo DIDN'T REALLY RECOMPILE
echo done