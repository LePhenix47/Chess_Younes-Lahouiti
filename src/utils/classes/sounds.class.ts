class Sounds {
  private static soundMap: Map<string, string> = new Map();

  public static addListOfSounds = (sounds: Map<string, string>): void => {
    for (const [name, sound] of sounds) {
      Sounds.addSound(name, sound);
    }
  };

  public static addSound = (name: string, sound: string): void => {
    this.soundMap.set(name, sound);
  };

  public static playSound = (sound: string): void => {
    const audio = new Audio(sound);
    audio.play();
  };
}

export default Sounds;
