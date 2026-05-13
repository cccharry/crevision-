import { defineType } from 'sanity';

/** 短对象：zh / en 至少一侧 */
export const bilingualShort = defineType({
  name: 'bilingualShort',
  title: '中英短文本',
  type: 'object',
  fields: [
    { name: 'zh', title: '中文', type: 'string' },
    { name: 'en', title: 'English', type: 'string' },
  ],
  validation: (rule) =>
    rule.custom((value: { zh?: string; en?: string } | undefined) => {
      const zh = value?.zh?.trim();
      const en = value?.en?.trim();
      return zh || en ? true : '中英文至少填写一侧';
    }),
});

/** 长文本 */
export const bilingualText = defineType({
  name: 'bilingualText',
  title: '中英正文',
  type: 'object',
  fields: [
    { name: 'zh', title: '中文', type: 'text', rows: 5 },
    { name: 'en', title: 'English', type: 'text', rows: 5 },
  ],
  validation: (rule) =>
    rule.custom((value: { zh?: string; en?: string } | undefined) => {
      const zh = value?.zh?.trim();
      const en = value?.en?.trim();
      return zh || en ? true : '中英文至少填写一侧';
    }),
});
