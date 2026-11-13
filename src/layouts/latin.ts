// Latin-script layouts. Each row lists keys left to right:
//   row 0: ` 1 2 3 4 5 6 7 8 9 0 - =        (13)
//   row 1: Q W E R T Y U I O P [ ] \        (13)
//   row 2: A S D F G H J K L ; '            (11)
//   row 3: <ISO key> Z X C V B N M , . /    (11)
// '␀' = nothing at that level. Dead keys are listed as their spacing
// character. AltGr layers follow Windows conventions.
import type { LayoutDef } from './types';

const STD_R3: [string, string] = ['<zxcvbnm,.-', '>ZXCVBNM;:_'];

export const LATIN: LayoutDef[] = [
  {
    id: 'us', name: 'US (QWERTY)', group: 'English',
    base: ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", '␀zxcvbnm,./'],
    shift: ['~!@#$%^&*()_+', 'QWERTYUIOP{}|', 'ASDFGHJKL:"', '␀ZXCVBNM<>?'],
  },
  {
    id: 'uk', name: 'UK', group: 'English', iso: true,
    base: ['`1234567890-=', 'qwertyuiop[]#', "asdfghjkl;'", '\\zxcvbnm,./'],
    shift: ['¬!"£$%^&*()_+', 'QWERTYUIOP{}~', 'ASDFGHJKL:@', '|ZXCVBNM<>?'],
    altgr: ['¦␀␀␀€␀␀␀␀␀␀␀␀', '␀␀é␀␀␀úíó␀␀␀␀', 'á␀␀␀␀␀␀␀␀␀␀', '␀␀␀␀␀␀␀␀␀␀␀'],
    altgrShift: ['␀␀␀␀␀␀␀␀␀␀␀␀␀', '␀␀É␀␀␀ÚÍÓ␀␀␀␀', 'Á␀␀␀␀␀␀␀␀␀␀', '␀␀␀␀␀␀␀␀␀␀␀'],
  },
  {
    id: 'us-intl', name: 'US International', group: 'English',
    base: ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", '␀zxcvbnm,./'],
    shift: ['~!@#$%^&*()_+', 'QWERTYUIOP{}|', 'ASDFGHJKL:"', '␀ZXCVBNM<>?'],
    altgr: ['␀¡²³¤€¼½¾‘’¥×', 'äåé®þüúíóö«»¬', 'áßð␀␀␀␀␀ø¶´', '␀æ␀©␀␀ñµç␀¿'],
    altgrShift: ['␀¹␀␀£␀␀␀␀␀␀␀÷', 'ÄÅÉ␀ÞÜÚÍÓÖ␀␀¦', 'Á§Ð␀␀␀␀␀Ø°¨', '␀Æ␀¢␀␀Ñ␀Ç␀␀'],
  },
  {
    id: 'dvorak', name: 'Dvorak (US)', group: 'English',
    base: ['`1234567890[]', "',.pyfgcrl/=\\", 'aoeuidhtns-', '␀;qjkxbmwvz'],
    shift: ['~!@#$%^&*(){}', '"<>PYFGCRL?+|', 'AOEUIDHTNS_', '␀:QJKXBMWVZ'],
  },
  {
    id: 'colemak', name: 'Colemak', group: 'English',
    base: ['`1234567890-=', 'qwfpgjluy;[]\\', "arstdhneio'", '␀zxcvbkm,./'],
    shift: ['~!@#$%^&*()_+', 'QWFPGJLUY:{}|', 'ARSTDHNEIO"', '␀ZXCVBKM<>?'],
  },
  {
    id: 'de', name: 'German (QWERTZ)', group: 'European', iso: true,
    base: ['^1234567890ß´', 'qwertzuiopü+#', 'asdfghjklöä', '<yxcvbnm,.-'],
    shift: ['°!"§$%&/()=?`', "QWERTZUIOPÜ*'", 'ASDFGHJKLÖÄ', '>YXCVBNM;:_'],
    altgr: ['␀␀²³␀␀␀{[]}\\␀', '@␀€␀␀␀␀␀␀␀␀~␀', '␀␀␀␀␀␀␀␀␀␀␀', '|␀␀␀␀␀␀µ␀␀␀'],
  },
  {
    id: 'ch-de', name: 'Swiss German', group: 'European', iso: true,
    base: ["§1234567890'^", 'qwertzuiopü¨$', 'asdfghjklöä', '<yxcvbnm,.-'],
    shift: ['°+"*ç%&/()=?`', 'QWERTZUIOPè!£', 'ASDFGHJKLéà', '>YXCVBNM;:_'],
    altgr: ['␀¦@#␀␀¬|¢␀␀´~', '␀␀€␀␀␀␀␀␀␀[]}', '␀␀␀␀␀␀␀␀␀␀{', '\\␀␀␀␀␀␀␀␀␀␀'],
  },
  {
    id: 'fr', name: 'French (AZERTY)', group: 'European', iso: true,
    base: ['²&é"\'(-è_çà)=', 'azertyuiop^$*', 'qsdfghjklmù', '<wxcvbn,;:!'],
    shift: ['␀1234567890°+', 'AZERTYUIOP¨£µ', 'QSDFGHJKLM%', '>WXCVBN?./§'],
    altgr: ['␀␀~#{[|`\\^@]}', '␀␀€␀␀␀␀␀␀␀␀¤␀', '␀␀␀␀␀␀␀␀␀␀␀', '␀␀␀␀␀␀␀␀␀␀␀'],
  },
  {
    id: 'be', name: 'Belgian (AZERTY)', group: 'European', iso: true,
    base: ['²&é"\'(§è!çà)-', 'azertyuiop^$µ', 'qsdfghjklmù', '<wxcvbn,;:='],
    shift: ['³1234567890°_', 'AZERTYUIOP¨*£', 'QSDFGHJKLM%', '>WXCVBN?./+'],
    altgr: ['␀|@#␀␀^␀␀{}␀␀', '␀␀€␀␀␀␀␀␀␀[]`', '␀␀␀␀␀␀␀␀␀␀´', '\\␀␀␀␀␀␀␀␀␀~'],
  },
  {
    id: 'es', name: 'Spanish', group: 'European', iso: true,
    base: ["º1234567890'¡", 'qwertyuiop`+ç', 'asdfghjklñ´', STD_R3[0]],
    shift: ['ª!"·$%&/()=?¿', 'QWERTYUIOP^*Ç', 'ASDFGHJKL\u00D1\u00A8', STD_R3[1]],
    altgr: ['\\|@#~€¬␀␀␀␀␀␀', '␀␀␀␀␀␀␀␀␀␀[]}', '␀␀␀␀␀␀␀␀␀␀{', '␀␀␀␀␀␀␀␀␀␀␀'],
  },
  {
    id: 'it', name: 'Italian', group: 'European', iso: true,
    base: ["\\1234567890'ì", 'qwertyuiopè+ù', 'asdfghjklòà', STD_R3[0]],
    shift: ['|!"£$%&/()=?^', 'QWERTYUIOPé*§', 'ASDFGHJKLç°', STD_R3[1]],
    altgr: ['␀␀␀␀␀€␀␀␀␀␀␀␀', '␀␀␀␀␀␀␀␀␀␀[]␀', '␀␀␀␀␀␀␀␀␀@#', '␀␀␀␀␀␀␀␀␀␀␀'],
    altgrShift: ['␀␀␀␀␀␀␀␀␀␀␀␀␀', '␀␀␀␀␀␀␀␀␀␀{}␀', '␀␀␀␀␀␀␀␀␀␀␀', '␀␀␀␀␀␀␀␀␀␀␀'],
  },
  {
    id: 'pt', name: 'Portuguese', group: 'European', iso: true,
    base: ["\\1234567890'«", 'qwertyuiop+´~', 'asdfghjklçº', STD_R3[0]],
    shift: ['|!"#$%&/()=?»', 'QWERTYUIOP*`^', 'ASDFGHJKL\u00C7\u00AA', STD_R3[1]],
    altgr: ['␀␀@£§€␀{[]}␀␀', '␀␀␀␀␀␀␀␀␀␀¨␀␀', '␀␀␀␀␀␀␀␀␀␀␀', '␀␀␀␀␀␀␀␀␀␀␀'],
  },
  {
    id: 'se', name: 'Swedish / Finnish', group: 'Nordic', iso: true,
    base: ['§1234567890+´', "qwertyuiopå¨'", 'asdfghjklöä', STD_R3[0]],
    shift: ['½!"#¤%&/()=?`', 'QWERTYUIOPÅ^*', 'ASDFGHJKLÖÄ', STD_R3[1]],
    altgr: ['␀␀@£$€␀{[]}\\␀', '␀␀␀␀␀␀␀␀␀␀␀~␀', '␀␀␀␀␀␀␀␀␀␀␀', '|␀␀␀␀␀␀µ␀␀␀'],
  },
  {
    id: 'no', name: 'Norwegian', group: 'Nordic', iso: true,
    base: ['|1234567890+\\', "qwertyuiopå¨'", 'asdfghjkløæ', STD_R3[0]],
    shift: ['§!"#¤%&/()=?`', 'QWERTYUIOPÅ^*', 'ASDFGHJKLØÆ', STD_R3[1]],
    altgr: ['␀␀@£$€␀{[]}␀´', '␀␀␀␀␀␀␀␀␀␀␀~␀', '␀␀␀␀␀␀␀␀␀␀␀', '␀␀␀␀␀␀␀µ␀␀␀'],
  },
  {
    id: 'dk', name: 'Danish', group: 'Nordic', iso: true,
    base: ['½1234567890+´', "qwertyuiopå¨'", 'asdfghjklæø', STD_R3[0]],
    shift: ['§!"#¤%&/()=?`', 'QWERTYUIOPÅ^*', 'ASDFGHJKLÆØ', STD_R3[1]],
    altgr: ['␀␀@£$€␀{[]}␀|', '␀␀␀␀␀␀␀␀␀␀␀~␀', '␀␀␀␀␀␀␀␀␀␀␀', '\\␀␀␀␀␀␀µ␀␀␀'],
  },
  {
    id: 'tr', name: 'Turkish (Q)', group: 'European', iso: true,
    base: ['"1234567890*-', 'qwertyuıopğü,', 'asdfghjklşi', '<zxcvbnmöç.'],
    shift: ["é!'^+%&/()=?_", 'QWERTYUIOPĞÜ;', 'ASDFGHJKLŞİ', '>ZXCVBNMÖÇ:'],
    altgr: ['␀␀£#$½␀{[]}\\|', '@␀€␀␀␀␀␀␀␀¨~`', 'æß␀␀␀␀␀␀␀´␀', '|␀␀␀␀␀␀␀␀␀␀'],
  },
];
