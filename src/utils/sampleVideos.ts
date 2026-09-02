import { SourceVideo } from '../types';

export const SAMPLE_VIDEOS: SourceVideo[] = [
  {
    id: 'sample-bunny-fails',
    title: 'Bunny & Flying Flying Apple Comedy',
    category: 'Funny / Comedy',
    description: 'Animated high-energy funny slapstick comedy scene with unexpected flying fruits.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80',
  },
  {
    id: 'sample-elephants-dream',
    title: 'Mind-Blowing Cyberpunk Machine Stunt',
    category: 'Epic / Sci-Fi',
    description: 'Surreal mechanical world animation with high-tension unexpected events.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=80',
  },
  {
    id: 'sample-for-bigger-blazes',
    title: 'Extreme Mountain Bike Downhill Jump',
    category: 'Action / Stunts',
    description: 'Fast-paced downhill bike jump cliff stunt that will make you gasp.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=400&q=80',
  },
  {
    id: 'sample-for-bigger-escapes',
    title: 'Astonishing Drone Canyon Fly-Through',
    category: 'Nature / Awe',
    description: 'Breathtaking high-speed canyon flyover with incredible lighting and sudden turns.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
  },
  {
    id: 'sample-tears-of-steel',
    title: 'Sci-Fi Robot Combat & Magic Climax',
    category: 'Sci-Fi / VFX',
    description: 'Giant robot face-off with laser barriers and jaw-dropping CGI effects.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&q=80',
  },
  {
    id: 'sample-we-are-going-on-bullrun',
    title: 'Supercar Drifting & Speed Reaction',
    category: 'Cars / Racing',
    description: 'Roaring engine sound and tire smoke rally drift around sharp hairpins.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80',
  }
];

export const SOUND_EFFECTS = [
  { id: 'sfx-airhorn', name: 'Airhorn Hype', icon: 'Volume2', emoji: '🎺', category: 'meme', soundKey: 'airhorn' as const },
  { id: 'sfx-boom', name: 'Mind Blown Boom', icon: 'Flame', emoji: '🤯', category: 'dramatic', soundKey: 'boom' as const },
  { id: 'sfx-laugh', name: 'Laugh Track', icon: 'Smile', emoji: '😂', category: 'funny', soundKey: 'laugh' as const },
  { id: 'sfx-applause', name: 'Crowd Applause', icon: 'Sparkles', emoji: '👏', category: 'reaction', soundKey: 'applause' as const },
  { id: 'sfx-dun', name: 'Dun Dun Dun!', icon: 'AlertCircle', emoji: '😱', category: 'dramatic', soundKey: 'dun_dun_dun' as const },
  { id: 'sfx-gasp', name: 'Gasp / Shock', icon: 'Zap', emoji: '😮', category: 'reaction', soundKey: 'gasp' as const },
  { id: 'sfx-punch', name: 'Slap / Punch', icon: 'ShieldAlert', emoji: '💥', category: 'funny', soundKey: 'punch' as const },
  { id: 'sfx-ding', name: 'Correct / Ding', icon: 'CheckCircle2', emoji: '✨', category: 'reaction', soundKey: 'ding' as const },
  { id: 'sfx-buzzer', name: 'Fail Buzzer', icon: 'XCircle', emoji: '❌', category: 'meme', soundKey: 'buzzer' as const },
  { id: 'sfx-cheer', name: 'Victory Cheer', icon: 'Trophy', emoji: '🎉', category: 'reaction', soundKey: 'cheer' as const },
];

export const REACTION_EMOJIS = [
  { emoji: '😂', label: 'LOL', soundKey: 'laugh' },
  { emoji: '🤯', label: 'Mindblown', soundKey: 'boom' },
  { emoji: '😱', label: 'OMG', soundKey: 'gasp' },
  { emoji: '🔥', label: 'Fire', soundKey: 'airhorn' },
  { emoji: '👏', label: 'Clap', soundKey: 'applause' },
  { emoji: '😭', label: 'Dead', soundKey: 'laugh' },
  { emoji: '💀', label: 'Bruh', soundKey: 'dun_dun_dun' },
  { emoji: '💯', label: '100', soundKey: 'ding' },
  { emoji: '👀', label: 'Wait What', soundKey: 'gasp' },
  { emoji: '🍿', label: 'Eating Popcorn', soundKey: 'cheer' },
];
