import { CARD_FIELDS } from '@/api/protocol';

export const SAVED_CARD_BATCH_SIZE = 50;
export const SAVED_CARD_RESULTS_LIMIT = 100;
export const NOVEL_DETAIL_RESULTS_LIMIT = 1;
export const NOVEL_DETAIL_FIELDS = `${CARD_FIELDS},titles{lang,title,latin,main,official},aliases,description,votecount,length,length_minutes,tags{id,name,spoiler},screenshots{id,url,thumbnail,dims,thumbnail_dims}`;
