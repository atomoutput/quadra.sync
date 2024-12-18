# Alesis QuadraVerb: SysEx Format

Bob Page, February 12, 1989

This information is presented in the hope that it will be useful, but no warrantees about its accuracy are expressed or implied. I'm interested in any changes/additions you have. Feel free to use this information in any way for any purpose, but please don't pretend you wrote it (leave my name in this document). I'd be happy if you send me code you write based on this info, but of course that's up to you.

Alesis is currently saying they are not going to release the QuadraVerb info "at this time". That could mean the "format" is subject to change, or they are withholding the info until some pet software companies get QV patch editors to the market, or maybe some other reason, I dunno. In any event, I needed the info, so I created it. And on with the show...

**Contents:**

*   System Exclusive Data Encoding Format
*   System Exclusive Command Format
    *   Dump Program (command code 03)
    *   Load Program (command code 02)
    *   Change Parameter (command code 01)
*   System Exclusive Program Format
*   Modulation Targets
*   Full Program Dump Format

## QuadraVerb System Exclusive Data Encoding Format

You first need to understand how the QV encodes its data for MIDI transmission. Although all 8 bits of a byte are used internally, the MIDI specification reserves the highest bit for status messages, so these high bits have to be "removed" from the data stream. The 8-bit QuadraVerb data is encoded for MIDI transmission into 7-bit data. The encoding looks like this:

Seven QuadraVerb bytes (each line represents one byte):

Byte
0: a7 a6 a5 a4 a3 a2 a1 a0
1: b7 b6 b5 b4 b3 b2 b1 b0
2: c7 c6 c5 c4 c3 c2 c1 c0
3: d7 d6 d5 d4 d3 d2 d1 d0
4: e7 e6 e5 e4 e3 e2 e1 е0
5: f7 f6 f5 f4 f3 f2 f1 f0
6: g7 g6 g5 g4 g3 g2 g1 g0


are transmitted as eight MIDI bytes:

0: 00 a7 a6 a5 a4 a3 a2 a1
1: 00 a0 b7 b6 b5 b4 b3 b2
2: 00 b1 b0 c7 c6 c5 c4 c3
3: 00 c2 c1 c0 d7 d6 d5 d4
4: 00 d3 d2 d1 d0 e7 e6 e5
5: 00 e4 e3 e2 e1 e0 f7 f6
6: 00 f5 f4 f3 f2 f1 f0 g7
7: 00 g6 g5 g4 g3 g2 g1 g0

//


Here is a C fragment to decode the data (note that you don't want to decode the SysEx status messsages; they are not encoded):

```c
unsigned char c, oc;

oc = 0;
for (i=0; ((c = getc(ifp)) < 0x80); i++) {
    i %= 147;                  /* end of program */
    if (shift = i % 8) {
        oc = (oc << shift) + (c >> (7-shift));
        putc(oc, ofp);
    }
oc = c;
}

//

All the info given below assumes the data has been decoded. If you are going to send the data back to the QV after editing it, you have to encode it first. Code fragment left as an exercise for the reader.

QuadraVerb System Exclusive Command Format
Note you have to tell the QuadraVerb to accept MIDI SysEx data before any of this will work. Although it's possible to instruct the QV to disable SysEx via MIDI SysEx; it's not possible to re-enable it; you have to go do it from the front panel.

A QuadraVerb SysEx command string looks like (in hex):

f0      SysEx start
00      \
00      Alesis mfr code
0e      /
02      QuadraVerb ID number
cc      Quadraverb command code
pp      Quadraverb command code parameter
dd      data stream (variable length)
f7      End of SysEx

//

The command codes are:

01 Change Parameter

02 Load Program

03 Dump Program

The parameters depend on the command and are discussed below.

Dump Program (command code 03)
To have an external device request a QuadraVerb program dump, send the following MIDI sequence to the QV:
f0 00 00 0e 02 03 pp f7

where '03' is the "dump data" command, and 'pp' is the hex parameter:

00-63 single program, 0-99

64 edit buffer

65 all program memory

Keep in mind if you're doing many edit/compares on program 27 you probably want to be dumping the edit buffer, not program 27, as #27 is only modified once the STORE is done.

//

Load Program (command code 02)
The format is similar:

f0 00 00 0e 02 02 pp (data) f7

where 'pp' is the same as in the above description. The data must be encoded before being sent. If you do it right you should send 155 bytes out the MIDI port (including SysEx etc) for an individual program.

//

Change Parameter (command code 01)
f0 00 00 0e 02 01 gg pp dd dd dd f7

where 'gg' is the 'parameter group' you want to change:

00 - program

01 - reverb

02 - delay

03 - pitch

04 - eq

05 - midi

06 - store

07 - config

08 - mix

09 - mod

0a - name

and 'pp' is the parameter number within parameter group (for example in 'reverb', parameter number 0 is 'Reverb Type', and the numbers increase the same as if you used the PAGE UP key).

The "dd dd dd" string is the value you want in that parameter. It must be encoded, even if it fits in 7 bits. Sometimes the value takes two bytes; in that case they should be sent MSB first, then LSB (this is the opposite of the HR-16). When one byte is encoded it will become two bytes; likewise two become three. If you're sending two bytes (after encoding) send them first, then 00, then f7.

The QV will also send you these Change Parameter requests every time a parameter is changed using the front panel. If somebody selects the Delay Time parameter and pushes the button to go from 1 to 400ms, you're going to get 400 of these messages. You will get messages every time the VALUE buttons get pushed, even when nothing changes (like being in program mode and pressing the down key when you're already at program zero), so be prepared for them.

You can't send running parameter change requests; each one has to be a separate SysEx message.

//

QuadraVerb System Exclusive Program Format:

A single program has 128 bytes of data. When it's encoded and shipped over MIDI, it's 147 bytes (without SysEx headers). That's why the decode fragment above has that magic number in it.

Unused locations have zeros in them. The EQ bytes change meaning depending on whether graphic EQ is being used, so both are given. Everything here is listed in decimal.

Graphic EQ parameters, only used in the Graphic_EQ->Delay configuration:

Byte	Description	Default	Range
0	???	??	?? [usually set to 14]
1	16Hz	14	0-28 (14 is center)
2	32Hz	14	0-28 (14 is center)
3	62Hz	14	0-28 (14 is center)
4	126Hz	14	0-28 (14 is center)
5	250Hz	14	0-28 (14 is center)
6	500Hz	14	0-28 (14 is center)
7	1kHz	14	0-28 (14 is center)
8	2kHz	14	0-28 (14 is center)
9	4kHz	14	0-28 (14 is center)
10	8kHz	14	0-28 (14 is center)
11	16kHz	14	0-28 (14 is center)
12	???	??	?? [usually set to 24]
Graphic EQ also seems to change all modulation targets to 16Hz boost/cut.

Here's the complete list, in byte order. Note that all parameters have a 'default' value you can get by pressing both VALUE buttons at the same time - if you're building a patch editor you might want this info so your user can hit a button to get the default value for some parameter.

Byte	Description	Default	Range
0	Low EQ Frequency MSB		
1	Low EQ Frequency LSB	200	20-999Hz
2	Low EQ Amplitude MSB		
3	Low EQ Amplitude LSB	280	0=-14db, 280=0db, 560=14db, 0.05 steps
4	Low EQ Frequency MSB		
5	Mid EQ Frequency LSB	2000	200-9999Hz
6	Mid EQ Bandwidth	100	20-255 (0.2-2.55 octaves)
7	Mid EQ Amplitude MSB		
8	Mid EQ Amplitude LSB	280	0=-14db, 280=0db, 560=14db, 0.05 steps
9	High EQ Frequency MSB		
10	High EQ Frequency LSB	8000	2000-18000Hz
11	High EQ Amplitude MSB		
12	High EQ Amplitude LSB	280	0=-14db, 280=0db, 560=14db, 0.05 steps
13	Leslie High Rotor Level	20	0-20db, 26=+6db
14	Low-Mid EQ Freq. MSB		
15	Low-Mid EQ Freq. LSB	100	20-500Hz (really 100Hz default!)
16	Low-Mid EQ Bandwidth	100	20-255 (0.2-2.55 octaves)
17	Low-Mid EQ Ampl. MSB		
18	Low-Mid EQ Ampl. LSB	280	0=-14db, 280=0db, 560=14db, 0.05 steps
19	High-Mid EQ Freq. MSB		
20	High-Mid EQ Freq. MSB	6000	2000-18000Hz
21	High-Mid EQ Bandwidth	100	20-255 (0.2-2.55 octaves)
22	High-Mid EQ Ampl. MSB		
23	High-Mid EQ Ampl. LSB	280	0=-14db, 280=0db, 560=14db, 0.05 steps
24	[unused]		
25	[unused]		
26	Pitch Mode	1	0-5 m/s_chorus, m/s_flange, phase, detune
27	Pitch Input	1	0=pre-eq, 1=post-eq
28	LFO Waveshape	0	0=triangle, 1=square
29	LFO/Phaser Speed	20	0=1, 98=99
30	LFO/Phaser Depth	50	0=1, 98=99
31	[unused]		
32	Pitch Feedback (%)	0	0-99
33	Detune Amount	99	0=-99, 99=none, 198=+99
34	Leslie Stereo Separation	99	0-99
35	Leslie Motor Control	1	0=off, 1=on
36	Leslie Motor Speed	0	0=slow, 1=fast
37	Trigger Flange	0	0=off, 1=on
38	[unused]		
39	Delay Type	1	0=mono, 1=stereo, 2=ping-pong
40	Delay Input 1	1	0=pre-eq, 1=post-e1
41	Delay Input Mix	99	0=input1, 99=center, 198=pitch/leslie
42	Left Delay Time (MSB)		1-400ms (1-800ms mono)
43	Left Delay Time (LSB)	100	If graphicEQ: 1-750ms (1-1500ms mono)
44	Left Delay Feedback (%)	0	0-99
45	Right Delay Time (MSB)		(Right not used in mono)
46	Right Delay Time (LSB)	100	1-400ms (if graphicEQ: 1-750ms)
47	Right Delay Feedback (%)	0	0-99
48	[unused]		
49	[unused]		
50	Reverb Type	0	0=plate, 1=room, 2=chamber, 3=hall, 4=rev
51	[unused]		
52	Reverb Input 1	3	0=pre-eq, 1=post-eq, 2=pitch, 3=delay_mix
53	Reverb Input 2	1	0=pitch out, 1=delay out
54	Reverb Input Mix	0	0=Input1, 99=center, 198=Input2
55	Reverb PreDelay	40	1-140ms
56	PreDelay Mix	198	0=Pre, 99=center, 198=Post
57	Reverb Decay	50	0-99
58	Reverb Diffusion Amount	8	0=1, 4=5, 8=9
59	Low Frequency Decay	60	0=-60, 30=-30, 60=0
60	High Frequency Decay	40	0=-60, 30=-30, 60=0
61	Reverb Density	8	0=1, 4=5, 8=9
62	Reverb Gate	0	0=off, 1=on
63	Reverb Gate Hold Time	0	0-99
64	Reverb Gate Release Time	80	0-99
65	Reverb Gated Level (%)	0	0-99
66	[unused]		
67	[unused]		
68	Configuration	0	0-4
69	Direct Signal Select	0	0=pre-eq, 1=post-eq
70	Direct/EQ Signal Level	99	0-99 (EQ Out if Direct Signal Select = 1)
71	Master Effects Level	50	0-99
72	Pitch/Leslie Out Level	50	0-99
73	Delay Output Level	50	0-99
74	Reverb Output Level	50	0-99
75	[unused]		
76	[unused]		
77	[unused]		
78	[unused]		
79	[unused]		
80	Mod 1 Source	0	0-125 (see list below)
81	Mod 1 Target	0	(see Modulation Targets section below)
82	Mod 1 Amplitude	0	0=-99, 99=0, 198=+99
83	Mod 2 Source		
84	Mod 2 Target		
85	Mod 2 Amplitude		
86	Mod 3 Source		
87	Mod 3 Target		Sources: 0=pitch_bend, 1=after_touch,
88	Mod 3 Amplitude		2=note_number, 3=note_velocity,
89	Mod 4 Source		4-125 correspond to MIDI
90	Mod 4 Target		controller numbers 0-121.
91	Mod 4 Amplitude		
92	Mod 5 Source		
93	Mod 5 Target		
94	Mod 5 Amplitude		
95	Mod 6 Source		
96	Mod 6 Target		
97	Mod 6 Amplitude		
98	Mod 7 Source		
99	Mod 7 Target		
100	Mod 7 Amplitude		
101	Mod 8 Source		
102	Mod 8 Target		
103	Mod 8 Amplitude		
104	[unused]		
105	[unused]		
106	Edit Name Character 1	32	The following 96 characters, in order:
107	Edit Name Character 2		!"#$%&'()*+,-./0123456789:;<=>?
108	Edit Name Character 3		@ABCDEFGHIJKLMNOPQRSTUVWXYZ[Y]^_
109	Edit Name Character 4		`abcdefghijklmnopqrstuvwxyz{
110	Edit Name Character 5		
111	Edit Name Character 6		The second Y is the Japanese 'Yen' or
112	Edit Name Character 7		Chinese 'Yuan' (monetary) symbol. The
113	Edit Name Character 8		last two characters are right and left
114	Edit Name Character 9		arrows. The backslash and tilde
115	Edit Name Character 10		characters are not available.
116	Edit Name Character 11		Note this list is in ASCII order, and
117	Edit Name Character 12		the ASCII equivalent is what's stored.
118	Edit Name Character 13		
119	Edit Name Character 14		
120	[unused]		
121	[unused]		
122	[unused]		
123	[unused]		
124	[unused]		
125	[unused]		
126	[unused]		
127	[unused]		
Modulation Targets
The target numbers are not constant; it depends on what configuration you are using, so you can't always change the target to #48 and know it always means your modulator affects Low EQ Frequency. What a pain.

0	Reverb Input Mix
1	Reverb PreDelay
2	Reverb PreDelay Mix
3	Reverb Reverse Time
4	Reverb Diffusion
5	Reverb Density
6	Reverb Low Decay
7	Reverb High Decay
16	Delay Input Mix
17	L/Mono Delay Time
18	L/Mono Delay Feedback
19	R Delay Time
20	R Delay Feedback
32	LFO/Phaser Speed
33	LFO/Phaser Depth
34	Pitch Feedback
48	Low EQ Frequency
49	Low EQ Amplitude
50	Mid EQ Frequency
51	Mid EQ Bandwidth
52	Mid EQ Amplitude
53	High EQ Frequency
54	High EQ Amplitude
55	
56	
57	
58	
59	
60	
64	Direct/EQ Mix Level
65	Effect Mix Level
66	Pitch/Leslie Mix Level
67	Delay Mix Level
68	Reverb Mix Level