import {Inngest} from 'inngest';

export const inngest = new Inngest ({
    id: 'Real Time Stock Market ',
    ai: {gemini: {apiKey: process.env.GEMINI_API_KEY! || ''}},
})