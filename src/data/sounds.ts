import type { Locale } from '../i18n/routing';

export type HomepageSoundCategory = 'beat' | 'bonus' | 'effect' | 'melody' | 'voice';

export interface HomepageSound {
  id: string;
  title: string;
  imageSrc: string;
  audioSrc: string;
}

const HOMEPAGE_SOUND_CATEGORIES: HomepageSoundCategory[] = ['beat', 'bonus', 'effect', 'melody', 'voice'];

function getHomepageSoundTitlePrefix(category: HomepageSoundCategory, locale: Locale): string {
  if (locale === 'zh') {
    const zh: Record<HomepageSoundCategory, string> = {
      beat: '节拍',
      bonus: '彩蛋',
      effect: '音效',
      melody: '旋律',
      voice: '人声',
    };
    return zh[category];
  }

  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function getHomepageSounds(locale: Locale = 'en'): HomepageSound[] {
  const sounds: HomepageSound[] = [];

  for (const category of HOMEPAGE_SOUND_CATEGORIES) {
    for (let index = 1; index <= 5; index += 1) {
      const id = `${category}${index}`;
      sounds.push({
        id,
        title: `${getHomepageSoundTitlePrefix(category, locale)} ${index}`,
        imageSrc: `/characters/images/${id}.png`,
        audioSrc: `/characters/sounds/${id}.wav`,
      });
    }
  }

  return sounds;
}

// Default (English) sound list.
export const HOMEPAGE_SOUNDS: HomepageSound[] = getHomepageSounds('en');
