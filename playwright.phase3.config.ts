import { defineConfig } from '@playwright/test';
import phase2 from './playwright.phase2.config';
export default defineConfig({...phase2,testMatch:['*.phase2.spec.ts','*.phase3.spec.ts']});
