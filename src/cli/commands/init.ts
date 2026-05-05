import pc from 'picocolors';
import { initProject } from '../../project/init-project.js';

export async function runInitCommand() {
  await initProject();
  console.log(pc.cyan('Minicode initialized.'));
}
