#!/usr/bin/env python3

import os

file_defines = [
    { 
        "in": "dir_list_start.html", 
        "out": "dir_list_start.h", 
        "rows": ['#pragma once', 'static const char *dir_list_html1 = ""']
    },
    { 
        "in": "dir_list_end.html", 
        "out": "dir_list_end.h", 
        "rows": ['#pragma once', 'static const char *dir_list_html2 = ""']
    },
    { 
        "in": "login.html", 
        "out": "login.h", 
        "rows": ['#pragma once', 'static const char *login_html = ""']
    },
    { 
        "in": "logout.html", 
        "out": "logout.h", 
        "rows": ['#pragma once', 'static const char *logout_html = ""']
    },
    { 
        "in": "preferences.html", 
        "out": "preferences.h", 
        "rows": ['#pragma once', 'static const char *preferences_html = ""']
    },
    { 
        "in": "share_list.html", 
        "out": "share_list.h", 
        "rows": ['#pragma once', 'static const char *share_list_html = ""']
    },
]

current_path = os.path.dirname(os.path.realpath(__file__))


def convert_file(in_name, out_name, out_lines):
    inf = open(os.path.join(current_path, in_name), "r")
    lines = inf.readlines()
    inf.close()
    

    for line in lines:
        if not line.startswith('//'):
            line = line.replace("\n", "")
            line = line.replace('"', '\\"')
            line = line.replace('\t', ' ')
            while '  ' in line:
                line = line.replace('  ', ' ')

            if len(line) > 0:
                line = '"' + line.strip() + '\\n"'

                out_lines.append(line)
    out_lines.append(';')

    outf = open(os.path.join(current_path, out_name), 'w')
    for line in out_lines:
        outf.write(line + '\n')
    outf.close()


for item in file_defines:
    convert_file(item["in"], item["out"], item["rows"])

