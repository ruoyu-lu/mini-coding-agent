import pc from 'picocolors';
import { initProject } from '../../workspace/project.js';

export async function runInitCommand() {
  await initProject();
  console.log(pc.cyan('Minicode initialized.'));
}
