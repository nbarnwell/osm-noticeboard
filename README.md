# osm-noticeboard

## Setting up your development environment

1. Install `node` (recommend using `nvm`)
1. Create the `OSM_client_id` and `OSM_client_secret` environment variables with values obtained from Online Scout Manager
1. Run `npm install`

## Running the app

1. Run `npm run start`

## When deploying

### Configuring on a [[Raspberry Pi]] for the first time

- Enable wifi
    - Run:
        ```bash
        sudo raspi-config
        ```
    - Go to:
        ```
        Localisation Options → WLAN Country
        ```
    - Choose your country (e.g. “GB – United Kingdom”)
    - Finish and reboot:
        ```bash
        sudo reboot
        ```
- Upgrade packages
    
    ```bash
    sudo apt update
    sudo apt full-upgrade -y
    ```
- Install base utilities (recommended before installing Node)
    
    ```bash
    sudo apt install -y git curl build-essential pkg-config
    ```
    
- Install Node.js (LTS version, properly) using the official NodeSource repo for stability and performance:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt install -y nodejs
    node -v
    npm -v
    ```
- Don't install "unclutter" to hide mouse cursor as it's not supported on "Wayland" (it's designed for X11)
- Create a *passphraseless* key using [instructions on Github](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent#generating-a-new-ssh-key)
    ```bash
    ssh-keygen -t ed25519 -C "OSM Noticeboard" -f ~/.ssh/id_ed25519_github-osmnoticeboard
    ```
- Add to `~/.ssh/config` file:
    ```
    Host github-osmnoticeboard
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github-osmnoticeboard
    IdentitiesOnly yes
    ```
- Add your public key to GitHub: 
    ```bash
    cat ~/.ssh/id_ed25519_github-osmnoticeboard.pub
    ```
    Copy that output and add it to your GitHub account under: Settings → SSH and GPG keys → New SSH key.
- *(Possibly not necessary since using a passwordless key)*: Tell ssh to use the key:
    ```bash
    ssh-add ~/.ssh/id_ed25519_github-osmnoticeboard
    ```
- Clone the repo to `~/osm-noticeboard`
    - `git clone git@github-osmnoticeboard:your-github-username-here/osm-noticeboard.git`
- Perform `npm install`
- Run `npm run update-version` (this writes the current version of the app to a file so it can be displayed on the UI and should be re-run on each upgrade)
- Create an .env file for the OSM API credentials
    
    - `vi ~/osm-noticeboard.env`
    -
        ```
        API_KEY=your-api-key-here
        API_SECRET=your-secret-here
        ```
    - Fix line-endings with `:s%/\r//` before saving, or `dos2unix [filename]` after saving, if necessary
    - Check permissions with `ls -l ~/osm-noticeboard.env`
- Check where `node` is using `which node` (for the next step)
    
- Configure `systemd` to start the webapp
    
    - Create a service file with `sudo vi /etc/systemd/system/osm-noticeboard.service`
    -
        ```
        [Unit]
        Description=OSM Noticeboard
        After=network.target
        
        [Service]
        User=admin
        WorkingDirectory=/home/admin/osm-noticeboard
        
        # Load environment variables from a file
        EnvironmentFile=/home/admin/osm-noticeboard.env
        
        # Command to start your app
        ExecStart=/usr/bin/node /home/admin/osm-noticeboard/app.js
        
        # Restart on failure
        Restart=always
        RestartSec=10
        
        # Output logs to journald
        StandardOutput=journal
        StandardError=journal
        
        [Install]
        WantedBy=multi-user.target
        ```
    - Fix line-endings with `:s%/\r//` before saving, or `dos2unix [filename]` after saving, if necessary
    - Reload systemd:
        ```bash
        sudo systemctl daemon-reload
        ```
    - Enable the service to start at boot:
    -
        ```bash
        sudo systemctl enable osm-noticeboard
        ```
    - Start it now:
    -
        ```bash
        sudo systemctl start osm-noticeboard
        ```
- Configure a systemd user service to start the browser in kiosk mode on startup:
    - Create an autostart script to open the browser:
        ```bash
        sudo vi ~/osm-noticeboard.sh
        ```
    - Script content:
        ```bash
        #!/bin/bash
        
        sleep 10
        /usr/bin/chromium --kiosk http://localhost:3000 --noerrdialogs --disable-infobars --disable-session-crashed-bubble
        ```
    - Make it executable:  
        ```bash
        sudo chmod +x ~/osm-noticeboard.sh
        ```
    - Create the service file
        
        ```bash
        mkdir -p ~/.config/systemd/user
        vi ~/.config/systemd/user/osm-noticeboard-kiosk.service
        ```
    - Service file content:
        ```
        [Unit]
        Description=OSM Noticeboard Kiosk Mode
        After=graphical-session.target
        PartOf=graphical-session.target
        
        [Service]
        Type=simple
        ExecStart=/home/admin/osm-noticeboard.sh
        Restart=on-failure
        RestartSec=20
        
        [Install]
        WantedBy=graphical-session.target
        ```
    - Enable the service:
        ```bash
        systemctl --user daemon-reload
        systemctl --user enable osm-noticeboard-kiosk
        systemctl --user start osm-noticeboard-kiosk
        ```