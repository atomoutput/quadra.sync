# quadra.sync

A modern MIDI delay calculator designed specifically for the Alesis Quadraverb. This web application helps musicians and audio engineers calculate precise delay times based on BPM and send them directly to their Quadraverb unit via MIDI sysex messages.

## Features

- 🎵 Real-time BPM calculation
- 🎹 MIDI clock sync support
- ⏱️ Standard and custom delay subdivisions
- 🎛️ Direct Quadraverb control via MIDI sysex
- 💾 Preset management
- 🌓 Light/Dark theme support
- 📱 Mobile-friendly responsive design
- 🔄 PWA support for offline use

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/quadra.sync.git
   cd quadra.sync
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Usage

1. **Setting BPM**
   - Enter BPM manually (20-300)
   - Use tap tempo button
   - Connect MIDI clock source

2. **Delay Times**
   - View standard subdivisions
   - Create custom subdivisions
   - Click to copy delay times

3. **MIDI Setup**
   - Select MIDI input for clock sync
   - Select MIDI output for Quadraverb
   - Send delay times via sysex

4. **Presets**
   - Save your favorite settings
   - Load presets with one click
   - Manage custom subdivisions

## Development

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Technical Details

- Built with vanilla JavaScript (ES modules)
- Uses Web MIDI API for MIDI communication
- Implements PWA features for offline use
- Modern build system with Rollup
- Code quality tools: ESLint & Prettier

## MIDI Implementation

The application uses the following MIDI messages:

1. **MIDI Clock Input**
   - Automatically calculates BPM from incoming MIDI clock

2. **Sysex Messages**
   - Manufacturer ID: Alesis (00 00 0E)
   - Device ID: Quadraverb (02)
   - Parameter changes follow Alesis sysex specification

## Browser Support

- Chrome 43+
- Edge 79+
- Firefox 76+
- Safari 10.1+
- Opera 30+

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
