# Development Workflow Rules

You MUST follow these rules when developing in this workspace:

1. **Mandatory Backup**: Before modifying any code or files in this project, you MUST run the `0nogithub\backup.ps1` script to create a backup of the current state.
2. **Explicit Push Confirmation**: When making git commits, do NOT push (`git push`) to the remote repository automatically. You must ONLY push the code if the user EXPLICITLY asks you or confirms that you should push. To push the code, you MUST execute the `0nogithub\push.ps1` script instead of using standard git push commands.
