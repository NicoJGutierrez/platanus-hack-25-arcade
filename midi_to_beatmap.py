import sys
import mido
from mido import MidiFile
import argparse


def note_to_freq(note):
    # Convert MIDI note number to frequency in Hz, rounded to 2 decimals
    return round(440 * (2 ** ((note - 69) / 12)), 2)


def main():
    parser = argparse.ArgumentParser(
        description='Convert MIDI file to beatmap for rhythm game')
    parser.add_argument('midi_file', help='Path to MIDI file')
    parser.add_argument('--channels', nargs='+', type=int,
                        default=[0, 1, 5], help='Channels to include (default: 0, 1, 5)')
    parser.add_argument(
        '--output', default='beatmap_output.txt', help='Output file')
    args = parser.parse_args()

    mid = MidiFile(args.midi_file)

    # Collect all note events
    events = []
    current_time = 0
    for msg in mid:
        current_time += msg.time * 1000  # convert to ms
        if msg.type in ['note_on', 'note_off'] and msg.channel in args.channels:
            events.append((current_time, msg))

    # Sort events by time
    events.sort(key=lambda x: x[0])

    # Group into chords: notes that start at the same time
    chords = []
    current_chord = []
    last_time = None

    for time, msg in events:
        if msg.type == 'note_on' and msg.velocity > 0:
            # new chord if time diff > 10ms
            if last_time is None or abs(time - last_time) > 10:
                if current_chord:
                    chords.append((last_time, current_chord))
                current_chord = []
                last_time = time
            current_chord.append(msg.note)
        elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
            # Note off, but we handle chords by start time
            pass

    if current_chord:
        chords.append((last_time, current_chord))

    # Generate beatmap
    beatmap = []
    prev_time = 0
    last_lane = 0

    for i, (time, notes) in enumerate(chords):
        delta_time = time - prev_time
        prev_time = time

        freqs = [note_to_freq(note) for note in notes]
        num_notes = len(notes)

        # Get previous and next num_notes
        prev_num = len(chords[i-1][1]) if i > 0 else 0
        next_num = len(chords[i+1][1]) if i < len(chords)-1 else 0

        # Determine change_type
        if num_notes == 1 or num_notes == 2:
            change_type = 2 if i > 0 else 1
        elif num_notes == 3:
            if prev_num == 1 and next_num == 1:
                change_type = 4  # triple
            else:
                change_type = 3  # double
        else:
            change_type = 4  # for more than 3, triple

        # For freq, use list if change_type > 1, else single
        freq = freqs if change_type > 1 else freqs[0]

        beatmap.append([int(delta_time), freq, change_type])

    # Write to output
    with open(args.output, 'w') as f:
        f.write('const beatmap = [\n')
        for item in beatmap:
            f.write(f'  {item},\n')
        f.write('];\n')

    print(f'Beatmap generated with {len(beatmap)} notes.')


if __name__ == '__main__':
    main()
