import { defineConfig } from '@playwright/test';
import phase3 from './playwright.phase3.config';
export default defineConfig({...phase3,testMatch:['*.phase2.spec.ts','*.phase3.spec.ts','*.phase4.spec.ts']});
