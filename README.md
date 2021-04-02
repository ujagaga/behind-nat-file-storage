# behind-nat-file-storage
Personal file storage for use without a public IP

## The Why
My internet connection is routed so I do not have a unique public IP address and can not access my files from outside local network. The opensource solutions I found online require PHP server, Apache,... so they are not very light weight. I want this to work on a very low end computer (Orange Pi Zero) so I decided to write my own minimalistic file server.

## Technology
I was having doubts whether to use mongoose.ws (https://github.com/cesanta/mongoose) and adjust it to my needs or use Python. I learned that FastApi (https://fastapi.tiangolo.com/) is 3 times faster than Flask (https://flask.palletsprojects.com), but in the end, mongoose web server, being pure C code, should be significantly faster than any Python framework. I tried to mesure speed of both on a Raspberry Pi Zero and concluded that mongoose is about 3 times faster than FastAPI at serving files at least on Raspberry pi zero.

"bnfs" (Behind Nat File Storage) app provides local network access and basic file operations (upload, download, cut, copy, paste, archive, share). When you share an item (folder or file), bnfs creates a symbolic link to the shared item in the share folder and displays the external share url. On access, you would go to https://<external_URL>/<shared_dir_code>. Anyone with the share url gets a read only access ig not logged in and admin access to a logged in user.
At startup a reversed tunnel is created (using a reversed proxy service. See https://localtunnel.github.io/www/) to create and maintain a publically available url. This url is prepended the share code to produce the shareable link. The LocalTunnel service allows specifying a subdomain, so you need to choose one (in bnfs settings) that is not likely to be occupied by someone else. This is to ensure that you do not get a different url when the connection is reset, so all your old share links still work through restarts.

## Building
I created a "build.sh" script to help build on linux. The mongoose web server does work on Windows and MacOs (refer to original repository: https://github.com/cesanta/mongoose) but windows does not support symbolic links, so this code is intended for linux only, but with small changes, it could probably be used on MacOs too.

The folder "html_source" contains html pages which need to be converted to C header files using "convert_to_string.py" script so they can be included in the application. This is already handled in the build script, but keep in mind, if you change html, you need to rebuild the app. 

The "helper_scripts" folder contains LCD_Driver.py for 16X2 LCD to display IP address and external URL.

The whole system is intended to be run on Orange Pi Zero single board computer but should be OK on any linux system. Some of the items in "install" folder:
 - usbmount_0.0.24_all.deb to help automount usb storage.
 - install/*.service scripts to use to run all necessary services
 - install/install_services.sh script to help install all services.

## Run the built executable
Before running the app, make sure you have Node-JS installed and Python3. Then install localtunnel (npm install -g localtunnel). There is  "install/install_dependencies.sh" to help with that.

All you need is the "updater.sh". It will download latest source and build it. To then run the app, just execute: 
	<path_to_bnfs> -d <folder_to_serve> [-p <port>]
To get help, run it without any parameters.
Default port is 8000.




## Status
The first usable version is ready and I am developping it as find a problem. For any questions, send me a message at ujagaga@gmail.com
