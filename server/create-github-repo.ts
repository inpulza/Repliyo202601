import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function createRepository() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });

  const repoName = process.argv[2] || 'my-replit-project';
  const description = process.argv[3] || 'Project created from Replit';
  const isPrivate = process.argv[4] === 'private';

  try {
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`\nConectado como: ${user.login}`);

    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description: description,
      private: isPrivate,
      auto_init: false
    });

    console.log('\n✅ Repositorio creado exitosamente!');
    console.log(`\n📁 Nombre: ${repo.name}`);
    console.log(`🔗 URL: ${repo.html_url}`);
    console.log(`📋 Clone URL: ${repo.clone_url}`);
    console.log(`🔒 Privado: ${repo.private ? 'Sí' : 'No'}`);
    
    console.log('\n--- Próximos pasos ---');
    console.log('Para subir tu código a GitHub, ejecuta:');
    console.log(`\ngit remote add origin ${repo.clone_url}`);
    console.log('git branch -M main');
    console.log('git push -u origin main');

    return repo;
  } catch (error: any) {
    if (error.status === 422) {
      console.error(`\n❌ Error: Ya existe un repositorio con el nombre "${repoName}"`);
    } else {
      console.error('\n❌ Error al crear repositorio:', error.message);
    }
    process.exit(1);
  }
}

createRepository();
