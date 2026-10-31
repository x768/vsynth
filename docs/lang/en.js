//#dynload _lang_mods['./lang/en.js']
export const params = {
    speed: 300,
    accent: 400,
};
export const variants = {
    'ga': {
        name: 'GA',
    },
};

export class ToPhonemic
{
    constructor() {
        this.dic = {};
        this.alias = {};
        this.count = 0;
    }

    // eslint-disable-next-line no-unused-vars
    load(dic) {
        // TODO
    }

    // eslint-disable-next-line no-unused-vars
    conv(src) {
        // TODO
        return '';
    }
}

export class ToSound
{
    // eslint-disable-next-line no-unused-vars
    constructor(prm) {
        // TODO
    }

    // eslint-disable-next-line no-unused-vars
    conv(src) {
        // TODO
        return [];
    }
}
