#!/usr/bin/env python3
'''
This script is run automatically from bnfs app to execute file system operations.
'''

import argparse
import json
import os
import shutil
from datetime import datetime
import zipfile
import string
import random
import hashlib


parser = argparse.ArgumentParser()
parser.add_argument('-o', metavar='--operation', help='Operation to perform',
                    choices=['CUT', 'COPY', 'ARCHIVE', 'SHARE', 'DELETE', 'RENAME', 'NEWDIR'], dest='OP', required=True)
parser.add_argument('-i', metavar='--items', help='Items for the operation', dest='ITMS', required=True)
parser.add_argument('-s', metavar='--source', help='Source of items', dest='SRC', required=True)
parser.add_argument('-d', metavar='--destination', help='Destination of result', dest='DST', required=True)
parser.add_argument('-r', metavar='--root', help='Root folder', dest='ROOT', required=True)

args = parser.parse_args()
SCRIPT_PATH = os.path.dirname(os.path.realpath(__file__))
root = ''
src = ''
dst = ''
items = []
SHARE_DIR = "share"


def sanitize_args():
    global root
    global src
    global dst
    global items

    root = args.ROOT
    if root.endswith('/'):
        root = root[:-1]

    src = args.SRC
    if src.endswith('/'):
        src = src[:-1]
    if src.startswith('/'):
        src = src[1:]
    if len(src) == 0:
        src = root
    else:
        src = os.path.join(root, src)

    dst = args.DST
    if dst.endswith('/'):
        dst = dst[:-1]
    if dst.startswith('/'):
        dst = dst[1:]
    dst = os.path.join(root, dst)

    try:
        input_items = json.loads(args.ITMS)
        for in_item in input_items:
            if in_item.endswith('/'):
                in_item = in_item[:-1]
            if in_item.startswith('/'):
                in_item = in_item[1:]

            items.append(in_item)
    except Exception as e:
        print("ERROR parsing items: {}".format(e))


def generate_code(file_path):  
    return hashlib.md5(file_path.encode("utf-8")).hexdigest()


def move_items():
    for item in items:
        src_path = os.path.join(src, item)
        target_name = item
        target_path = os.path.join(dst, target_name)

        while os.path.exists(target_path):
            # Calculate new target
            if os.path.isfile(target_path):
                item_name, item_extension = os.path.splitext(target_name)
            else:
                item_extension = ""
                item_name = target_name

            name_pieces = item_name.split("_")

            try:
                end_num = int(name_pieces[-1], 10)
            except:
                end_num = None

            if end_num is None:
                item_name += "_1"
            else:
                item_name = item_name[:-1 * len(name_pieces[-1])] + "{}".format(end_num + 1)

            target_name = item_name + item_extension
            target_path = os.path.join(dst, target_name)

        try:
            shutil.move(src_path, target_path)
        except Exception as e:
            print("ERROR:{}".format(e))
            return "Error moving {}".format(item)

    return "OK"


def copy_items():
    for item in items:
        src_path = os.path.join(src, item)
        target_name = item
        target_path = os.path.join(dst, target_name)

        while os.path.exists(target_path):
            # Calculate new target
            if os.path.isfile(target_path):
                item_name, item_extension = os.path.splitext(target_name)
            else:
                item_extension = ""
                item_name = target_name

            item_name = item_name + "_copy"

            target_name = item_name + item_extension
            target_path = os.path.join(dst, target_name)

        try:
            if os.path.isdir(src_path):
                shutil.copytree(src_path, target_path)
            elif os.path.isfile(src_path):
                shutil.copy(src_path, target_path)
            else:
                return "Error copying {}: Unsuported type".format(item)
        except Exception as e:
            print("ERROR:{}".format(e))
            return "Error moving {}".format(item)

    return "OK"


def archive():
    os.chdir(src)
    # Generate name
    now = datetime.now()
    archive_name = now.strftime("_%d.%m.%Y.%H.%M.%S.zip")
    zip_archive = zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED)

    for item in items:
        # print("ADDING: ", item)
        if os.path.isfile(item):
            zip_archive.write(item)
        elif os.path.isdir(item):
            for root, dirs, files in os.walk(item):
                for file in files:
                    zip_archive.write(os.path.join(root, file),
                                      os.path.relpath(os.path.join(root, file),
                                                      os.path.join(item, '..')))

    zip_archive.close()
    return "OK"


def remove():
    for item in items:
        src_path = os.path.join(src, item)

        if os.path.isdir(src_path):
            try:
                shutil.rmtree(src_path)
            except:
                pass
        if os.path.islink(src_path):
            try:
                os.unlink(src_path)
            except:
                pass        
        else:
            try:
                os.remove(src_path)
            except:
                pass

    return "OK"


def rename():
    dst = args.DST
    if dst.endswith('/'):
        dst = dst[:-1]
    if dst.startswith('/'):
        dst = dst[1:]

    os.chdir(src)
    os.rename(items[0], dst)

    return "OK"


def share():
    dst_path = os.path.join(root, SHARE_DIR)
    if not os.path.isdir(dst_path):
        os.mkdir(dst_path)

    file_name = items[0]
    src_path = os.path.join(src, file_name)
    code = generate_code(src_path)
    dst_path = os.path.join(dst_path, code)

    if not os.path.islink(dst_path):
        os.symlink(src_path, dst_path)

    if os.path.isdir(src_path):
        code += '/'

    return code


def newdir():
    dir_path = os.path.join(root, dst, items[0])
    try:
        os.mkdir(dir_path)
    except Exception as e:
        return "Error: {}".format(e)
    return "OK"


sanitize_args()
if args.OP.startswith("CUT"):
    print(move_items())

elif args.OP.startswith("COPY"):
    print(copy_items())

elif args.OP.startswith("ARCHIVE"):
    print(archive())

elif args.OP.startswith("DELETE"):
    print(remove())

elif args.OP.startswith("RENAME"):
    print(rename())

elif args.OP.startswith("SHARE"):
    print(share())

elif args.OP.startswith("NEWDIR"):
    print(newdir())

else:
    print("Unknown operation: {}".format(args.OP))
