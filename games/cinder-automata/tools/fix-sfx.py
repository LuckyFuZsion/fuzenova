"""Cleans up ElevenLabs sound-effect downloads made with looping on.

Those files are a circular buffer: the real sound starts part-way through (after a stretch of near-silence), runs to the
end of the file, and its tail wraps round to the start. Often the end also swells back up so it joins the start. This
rotates each file so it begins at the true onset, optionally cuts off a swell, trims silence, fades the ends, and
saves a tidy mono mp3.

Usage: python tools/fix-sfx.py            (processes the recipes below)
"""
import subprocess, wave, os, sys, glob, shutil
import numpy as np

SR = 44100
DL = r'C:\Users\STEVE\Downloads'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'sfx')
ALT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'alt')
ORIG = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'original')
os.makedirs(ORIG, exist_ok=True)

def load(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()

def env_db(a, hop=0.01):
    h = int(SR * hop)
    n = len(a) // h
    return np.array([20 * np.log10(np.sqrt(np.mean(a[i * h:(i + 1) * h] ** 2)) + 1e-7) for i in range(n)]), h

def onset(a):
    """Index of the loudest sudden start that follows near-silence, or None if the file has no such gap."""
    e, h = env_db(a)
    best, best_level = None, -999
    for i in range(15, len(e) - 5):
        before = e[i - 15:i - 1].max()
        after = e[i + 1:i + 5].max()
        if before < -50 and after > -35 and after > best_level:
            best, best_level = i, after
    return None if best is None else max(0, best * h - int(SR * 0.004))

def trim(a, floor_db=-58, lead=0.004, tail=0.05):
    e, h = env_db(a)
    loud = np.where(e > floor_db)[0]
    if not len(loud): return a
    s = max(0, loud[0] * h - int(SR * lead))
    t = min(len(a), (loud[-1] + 1) * h + int(SR * tail))
    return a[s:t]

def fade(a, fin=0.002, fout=0.12):
    a = a.copy()
    n_in = min(len(a) // 4, int(SR * fin)); n_out = min(len(a) // 2, int(SR * fout))
    if n_in: a[:n_in] *= np.linspace(0, 1, n_in)
    if n_out: a[-n_out:] *= np.linspace(1, 0, n_out) ** 1.5
    return a

def save(a, path, peak_db=-1.5):
    a = a / (np.abs(a).max() + 1e-9) * (10 ** (peak_db / 20))
    tmp = path + '.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-codec:a', 'libmp3lame', '-q:a', '4', path], check=True)
    os.remove(tmp)

def process(src_glob, name, out_dir=OUT, rotate=True, keep=None, fout=0.12):
    """keep=(start_s, end_s) applies to the file as downloaded (before any rotation) and is used to cut off a loop swell."""
    files = glob.glob(os.path.join(DL, src_glob))
    if not files: print('MISSING', src_glob); return
    shutil.copyfile(files[0], os.path.join(ORIG, name + '.mp3'))  # keep the untouched download next to the result so the sound test page can compare
    a = load(files[0])
    if keep: a = a[int(keep[0] * SR):int(keep[1] * SR)]
    elif rotate:
        o = onset(a)
        if o is not None: a = np.concatenate([a[o:], a[:o]])
    a = fade(trim(a), fout=fout)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, name + '.mp3')
    save(a, path)
    print(f'{name:22s} {len(a) / SR:5.2f}s  <- {os.path.basename(files[0])[:40]}')

def process_loop(src_glob, name, xfade=0.6, target_rms_db=-26.0, peak_db=-3.0):
    """A looping bed (machine hum, wind): blend the end into the start so it repeats without a bump, and set every
    loop to the same loudness so they can be mixed by the game instead of fighting each other."""
    files = glob.glob(os.path.join(DL, src_glob))
    if not files: print('MISSING', src_glob); return
    shutil.copyfile(files[0], os.path.join(ORIG, name + '.mp3'))
    a = load(files[0])
    n = int(xfade * SR)
    t = np.linspace(0, np.pi / 2, n)
    blend = a[-n:] * np.cos(t) + a[:n] * np.sin(t)
    a = np.concatenate([a[n:-n], blend])
    rms = np.sqrt(np.mean(a ** 2)) + 1e-9
    a = a * (10 ** (target_rms_db / 20) / rms)
    peak = np.abs(a).max()
    if peak > 10 ** (peak_db / 20): a = a * (10 ** (peak_db / 20) / peak)
    save(a, os.path.join(OUT, name + '.mp3'), peak_db=20 * np.log10(np.abs(a).max() + 1e-9))
    print(f'{name:22s} {len(a) / SR:5.2f}s loop, rms {20 * np.log10(np.sqrt(np.mean(a ** 2))):.1f} dB  <- {os.path.basename(files[0])[:40]}')


if __name__ == '__main__':
    process('Short_crisp_mechanic_#4-*.mp3', 'ui-click', fout=0.06)
    process('Metal_panel_sliding__#2-*.mp3', 'ui-open', rotate=False, fout=0.15)
    process('Dull_low_electronic__#2-*.mp3', 'ui-denied')
    process('Dull_low_electronic__#1-*.mp3', 'ui-denied-b', out_dir=ALT)
    process('Dull_low_electronic__#4-*.mp3', 'ui-denied-c', out_dir=ALT)
    process('A_single_deep_metal__#1-*.mp3', 'ui-star', rotate=False, keep=(0.47, 2.46), fout=0.6)
    process('Bright_triumphant_me_#2-*.mp3', 'ui-star-a', out_dir=ALT, fout=0.25)
    process('Bright_triumphant_me_#1-*.mp3', 'ui-star-b', out_dir=ALT, fout=0.25)
    process('Bright_triumphant_me_#4-*.mp3', 'ui-star-c', out_dir=ALT, fout=0.25)
    process('Short_victorious_bra_#2-*.mp3', 'ui-level-complete', fout=0.3)
    process('Calm_mechanical_chim_#1-*.mp3', 'ui-build-start', fout=0.25)
    process('Deep_warning_horn_bl_#1-*.mp3', 'ui-fight-start', fout=0.3)
    # defeat: no silent gap to rotate on; the loud swell at the end of each file is the loop joining back to the start, so cut before it
    process('Heavy_descending_ind_#1-*.mp3', 'ui-defeat', rotate=False, keep=(0, 2.1), fout=0.5)
    process('Heavy_descending_ind_#4-*.mp3', 'ui-defeat-b', out_dir=ALT, rotate=False, keep=(0, 2.6), fout=0.5)

    # building sounds: several takes each, all shipped; the game picks one at random each time
    def takes(glob_prefix, name, fout):
        for i in range(1, 5):
            process(f'{glob_prefix}_#{i}-*.mp3', name if i == 1 else f'{name}-{i}', fout=fout)
    takes('Heavy_metal_machine_', 'place-building', 0.15)
    takes('Very_short_light_met', 'place-belt', 0.03)
    takes('Wrench_ratcheting_th', 'remove-building', 0.15)
    takes('Tiny_ratchet_click,_', 'rotate', 0.03)
    process('Small_mechanical_gra_#2-*.mp3', 'pickup', fout=0.1)
    process('Machine_set_down_gen_#4-*.mp3', 'drop-building', fout=0.12)
    # looping beds: all set to the same loudness; the game decides how loud each one plays
    process_loop('Steady_industrial_mi_#2-*.mp3', 'loop-drill', 0.6)
    process_loop('Small_robotic_assemb_#3-*.mp3', 'loop-assembler', 0.6)
    process_loop('Soft_steady_conveyor_#4-*.mp3', 'loop-belt', 0.6)
    process_loop('5_s_Low_furnace_roar_#3-*.mp3', 'loop-smelter', 0.6)
    process_loop('Steady_low_engine_ru_#4-*.mp3', 'loop-generator', 0.6)
    process_loop('Quiet_electrical_hum_#3-*.mp3', 'loop-coil-idle', 0.6)
    process_loop('Desolate_windswept_w_#4-*.mp3', 'loop-ambience-ash', 1.5)
    process_loop('Tense_low_battlefiel_#4-*.mp3', 'loop-ambience-fight', 1.5)

    # combat sounds
    process('Sharp_crackling_blue_#2-*.mp3', 'coil-zap', fout=0.1)
    process('Small_robot_soldier__#4-*.mp3', 'robot-shot', fout=0.08)
    process('Bullet_ricochet_spar_#3-*.mp3', 'bullet-hit', fout=0.08)
    process('corroded_machine_bur_#1-*.mp3', 'enemy-death', fout=0.12)
    process('Large_armoured_walke_#1-*.mp3', 'boss-arrive', fout=0.4)
    process('wall_collapsing_unde_#4-*.mp3', 'structure-destroyed', fout=0.3)
    process('Deep_resonant_clang__#2-*.mp3', 'structure-hit', fout=0.2)
    process('Urgent_repeating_low_#1-*.mp3', 'core-alarm', fout=0.2)
