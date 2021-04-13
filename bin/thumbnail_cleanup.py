#!/usr/bin/env python3
'''
Runs through served dir and finds all folders named ".thumbs".
Then verifies that each thumbnail has an image file. If not, it is deleted.
'''

import os
import sys
import time
from datetime import datetime

FULL_DAY = 83000    # 60x60x24=86400 seconds, but this is sufficient to wait for

if len(sys.argv) < 2:
    sys.exit("Usage: {} <path/to/folder/to/check>".format(os.path.basename(__file__)))


def check_thumbs_dir(dirPath):
    originalSource = os.path.dirname(dirPath)
    for item in os.listdir(dirPath):
        itemPath = os.path.join(dirPath, item)
        if os.path.isfile(itemPath):
            sourcePath = os.path.join(originalSource, item)
            if not os.path.isfile(sourcePath):
                os.remove(itemPath)


def scan_for_thumbs_dirs(rootDir):
    thumbs_dirs = []

    for dirName, subdirList, fileList in os.walk(rootDir):
        if dirName.endswith("/.thumbs"):
            thumbs_dirs.append(dirName)

    for thumbsDir in thumbs_dirs:
        check_thumbs_dir(thumbsDir)


root = sys.argv[1]
print("Checking thumbnails from ", root)
scan_for_thumbs_dirs(root)
     
