# behind-nat-file-storage
Personal file storage for use without a public IP

## The Why
My internet connection is routed so I do not have a unique public IP address and can not access my files from outside local network. The opensource solutions I found online require PHP server, Apache,... so they are not very light weight. I want this to work on a very low end computer (Orange Pi Zero, Raspberry Pi Zero,...) so I decided to write my own minimalistic file server.

## Technology
Mongoose web server is an open source app (https://github.com/cesanta/mongoose) that I used to write my web based file server. It is written in pure C, so it is very fast. Comparing to Python, it is more than 3 times faster than FastApi and about 10 times faster than Flask. 

"bnfs" (Behind Nat File Storage) app provides local network access and basic file operations (upload, download, cut, copy, paste, archive, share). When you share an item (folder or file), bnfs creates a symbolic link to the shared item in the "share" folder and displays the external share url. On access, you would go to https://<external_URL>/share/<shared_dir_code>. Anyone with the share url gets a read only access if not logged in and admin access to a logged in user.
At startup a reversed proxy tunnel is created (https://localtunnel.github.io/www/) to create and maintain a publically available url. This url is prepended to the file/folder share code to produce the shareable link. The LocalTunnel service allows specifying a subdomain, so you need to choose one (in bnfs settings) that is not likely to be occupied by someone else. This is to ensure that you do not get a different url when the connection is reset, so all your old share links still work through restarts.

## Building
I created a "src/build.sh" script to help build on linux. The mongoose web server does work on Windows and MacOs (refer to original repository: https://github.com/cesanta/mongoose) but windows does not support symbolic links, so this code is intended for linux only, and with small changes, it could probably be used on MacOs too.

The folder "html_source" contains html pages which need to be converted to C header files using "convert_to_string.py" script so they can be included in the application. This is already handled in the build script, but keep in mind, if you change html files, you need to rebuild the app. 

The "bin" folder contains LCD_Driver.py for 16X2 LCD to display IP address and external URL.

The whole system is intended to be run on Orange Pi Zero single board computer, but tested OK on Ubuntu. 
To run the built executable in development environment, make sure you have Node-JS installed and Python3. 
Running the app with no parameters will display help, but minimum command is: /bin/bnfs -d <dir/to/serve> -p <app_port>

If you wish to try external acces go to settings and select external tunnel subdomain.
Then install localtunnel (npm install -g localtunnel). To open the tunnel execute: lt -p <app_port> -s <desired_subdomain>.

To just do the quick install, run the interactive installer, "install.sh" as root. It will download the repository, build the files, install binaries in "/opt/bnfs" and setup services for automatic startup.

## Tips
1. In the "bin" folder you will find "share_files.sh". I use it to quickly share a specified folder. Usage is described in the script, but basically, just call the script with folder to serve as an argument.

2. If you share a folder with a "Pictures" directory in it's root, everything in the "Pictures" will be displayed with image preview support, so you can easilly share familly photos.

3. bnfs supports uploading files from web browser, but also from terminal:
curl "<bnfs_ip>:<port>/?name=<file_name_to_use>" -T <path_to_file_to_upload>

The previous command works for unauthorized users in either local network of from outside. The file will be uploaded in the "upload" folder. If you allow local network access without password, if uploading from local network, you can also choose the location:
curl "<bnfs_ip>:<port>/<path_to_upload_dir>?name=<file_name_to_use>" -T <path_to_file_to_upload>

After an upload, you will get a shareable download link to use to download the file. You can disable sharing if you specify parameter: share=n.
curl "<bnfs_ip>:<port>/?name=<file_name_to_use>&share=n" -T <path_to_file_to_upload>

## Current status
So far, everything seems to work fine. 
If you find another bug, please let me know.

## Contact
For any questions, send me a message at ujagaga@gmail.com
