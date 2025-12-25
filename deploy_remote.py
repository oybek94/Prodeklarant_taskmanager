#!/usr/bin/env python3
"""
Deployment script to upload and execute deployment on remote server
"""
import paramiko
import sys
import os

SERVER = "138.249.7.15"
USER = "root"
PASSWORD = "a9794536"
REMOTE_SCRIPT = "/root/deploy-remote.sh"

def upload_and_execute():
    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        print(f"Connecting to {SERVER}...")
        ssh.connect(SERVER, username=USER, password=PASSWORD, timeout=30)
        print("Connected successfully!")
        
        # Read local script
        with open("deploy-remote.sh", "rb") as f:
            script_content = f.read()
        
        # Upload script
        print("Uploading deployment script...")
        sftp = ssh.open_sftp()
        with sftp.file(REMOTE_SCRIPT, "w") as remote_file:
            remote_file.write(script_content)
        sftp.chmod(REMOTE_SCRIPT, 0o755)
        sftp.close()
        print("Script uploaded successfully!")
        
        # Execute script
        print("Executing deployment script...")
        print("=" * 50)
        stdin, stdout, stderr = ssh.exec_command(f"bash {REMOTE_SCRIPT}")
        
        # Stream output with error handling for encoding
        for line in stdout:
            try:
                print(line.rstrip())
            except UnicodeEncodeError:
                try:
                    print(line.rstrip().encode('ascii', 'ignore').decode('ascii'))
                except:
                    pass
        
        # Check for errors
        try:
            error_output = stderr.read().decode('utf-8', errors='ignore')
            if error_output:
                print("Errors:", file=sys.stderr)
                print(error_output, file=sys.stderr)
        except:
            pass
        
        exit_status = stdout.channel.recv_exit_status()
        
        print("=" * 50)
        if exit_status == 0:
            print("Deployment completed successfully!")
        else:
            print(f"Deployment failed with exit status {exit_status}")
            sys.exit(1)
        
        ssh.close()
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if not os.path.exists("deploy-remote.sh"):
        print("Error: deploy-remote.sh not found!", file=sys.stderr)
        sys.exit(1)
    upload_and_execute()

