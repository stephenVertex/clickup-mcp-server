const args = process.argv.slice(2);
const envArgs: { [key: string]: string } = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--env' && i + 1 < args.length) {
    const [key, value] = args[i + 1].split('=');
    if (key === 'CLICKUP_API_KEY') envArgs.clickupApiKey = value;
    if (key === 'CLICKUP_TEAM_ID') envArgs.clickupTeamId = value;
    i++;
  }
}

interface Config {
  clickupApiKey: string;
  clickupTeamId: string;
}

const configuration: Config = {
  clickupApiKey: envArgs.clickupApiKey || process.env.CLICKUP_API_KEY || '',
  clickupTeamId: envArgs.clickupTeamId || process.env.CLICKUP_TEAM_ID || '',
};

const missingEnvVars = Object.entries(configuration)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

export default configuration;
