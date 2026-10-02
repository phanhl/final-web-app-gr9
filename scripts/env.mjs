// Load .env for CLI scripts (Next.js loads it for the app itself)
try {
    process.loadEnvFile?.('.env');
} catch {
    // no .env file: rely on the environment
}
