#!/usr/bin/env python3
'''
Helper script to drive the I2C 16x2 LCD on Orange Pi Zero. It displays the current IP address, server busy status and external tunnel URL.
'''
# The wiring for the LCD is as follows:
# 1 : GND
# 2 : 5V
# 3 : Contrast (0-5V)*
# 4 : RS (Register Select)    GPIO7 (12)
# 5 : R/W (Read Write)        GROUND THIS PIN
# 6 : Enable or Strobe        GPIO19 (16)
# 7 : Data Bit 0             - NOT USED
# 8 : Data Bit 1             - NOT USED
# 9 : Data Bit 2             - NOT USED
# 10: Data Bit 3             - NOT USED
# 11: Data Bit 4              GPIO18 (18)
# 12: Data Bit 5              GPIO2 (22)
# 13: Data Bit 6              GPIO13 (24)
# 14: Data Bit 7              GPIO10 (26)
# 15: LCD Backlight +5V       GPIO198 (8)
# 16: LCD Backlight GND

import OPi.GPIO as GPIO
import time
import socket
import requests as req
import json
import os


# Define GPIO.to LCD mapping for OrangePi Zero
LCD_RS = 12
LCD_E  = 16
LCD_D4 = 18
LCD_D5 = 22
LCD_D6 = 24
LCD_D7 = 26
LCD_LED = 8

# Define some device constants
LCD_WIDTH = 16    # Maximum characters per line
LCD_CHR = True
LCD_CMD = False

LCD_LINE_1 = 0x80 # LCD RAM address for the 1st line
LCD_LINE_2 = 0xC0 # LCD RAM address for the 2nd line

# Timing constants
E_PULSE = 0.0005
E_DELAY = 0.0005
SERVER_BUSY_TIMEOUT = 10
PING_TIMEOUT = 60
tunnel_url = ""
CONFIG_PATH = os.path.join(os.path.expanduser("~"), ".bnfs", "settings.cfg")
last_ping_time = 0
last_ping_status = 0
lcd_lines = ["", ""]
lcd_pos = [0, 0]
lcd_pause_count = [0, 0]


# Read configuration file to extract tunnel subdomain
def get_config():
    global tunnel_url

    tunnel_url = ""
    with open(CONFIG_PATH, "r") as file:
        for line in file.readlines():
            if "SUBDOMAIN" in line:
                tunnel_subdomain = line.replace("\n", "").split(" ")[1].strip()
                tunnel_url = "https://{}.loca.lt".format(tunnel_subdomain)


# Pings the bnfs server via open tunnel to confirm connectivity
def get_tunnel_status():
    global last_ping_time
    global last_ping_status

    try:
        print('Pinging: ', tunnel_url)
        resp = req.get(tunnel_url + "/api/status", headers={"Bypass-Tunnel-Reminder": "random-value"}, timeout=5)
        print(resp.status_code)

        last_ping_time = time.time()
        last_ping_status = resp.status_code

        return resp.status_code == 200

    except Exception as e1:
        print("ERR:", e1)
        return False


# Extracts current local IP
def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP


# Queries bnfs server for current status
def server_busy():
    try:
        resp = req.get("http://localhost/api/status", timeout=5)
        try:
            response = json.loads(resp.text)
            last_op_timestamp = int(response["last_op_at"])
            last_op_period = int(time.time()) - last_op_timestamp
            # print("OP AGO:", last_op_period)
            if last_op_period < SERVER_BUSY_TIMEOUT:
                return "BUSY"
            else:
                return "FREE"
        except Exception as pe:
            print("\nERR parsing response:", pe)
            return "ERR"
    except req.exceptions.Timeout:
        print("\nERR Timeout")
        return "BUSY"
    except req.exceptions.ConnectionError as ce:
        print("\nERR Connecting:", ce)
        return "ERR"
    except req.exceptions.RequestException as re:
        print("\nERR other exception:", re)
        return "ERR"
    except Exception as ge:
        print("ERR general exception: ", ge)
        return "ERR"


# Main initialization and infinite loop
def main():
    get_config()

    GPIO.setboard(GPIO.ZERO)
    GPIO.setmode(GPIO.BOARD)
    GPIO.setup(LCD_E, GPIO.OUT)
    GPIO.setup(LCD_RS, GPIO.OUT)
    GPIO.setup(LCD_D4, GPIO.OUT)
    GPIO.setup(LCD_D5, GPIO.OUT)
    GPIO.setup(LCD_D6, GPIO.OUT)
    GPIO.setup(LCD_D7, GPIO.OUT)
    GPIO.setup(LCD_LED, GPIO.OUT)
    GPIO.output(LCD_LED, 1)

    lcd_init()
    counter = 0
    while True:
        if counter > 4:
            msg = "Busy"
            busy = server_busy()
            while "BUSY" in busy:
                lcd_lines[0] = msg
                msg += "."
                if len(msg) > 16:
                    msg = "Busy"

                refresh_lcd()
                time.sleep(1)
                busy = server_busy()

            ipAddr = get_ip()
            lcd_lines[0] = ipAddr
            # lcd_string(ipAddr, LCD_LINE_1)

            if "FREE" in busy:
                if (time.time() - last_ping_time) > PING_TIMEOUT:
                    tunnel_status = get_tunnel_status()
                    if tunnel_status is not None:
                        if tunnel_status:
                            lcd_lines[1] = tunnel_url
                            # lcd_string(tunnel_url, LCD_LINE_2)

        refresh_lcd()
        counter += 1
        time.sleep(1)  # 5 second delay


def lcd_init():
    # Initialise display
    lcd_byte(0x33, LCD_CMD)  # 110011 Initialise
    lcd_byte(0x32, LCD_CMD)  # 110010 Initialise
    lcd_byte(0x06, LCD_CMD)  # 000110 Cursor move direction
    lcd_byte(0x0C, LCD_CMD)  # 001100 Display On,Cursor Off, Blink Off
    lcd_byte(0x28, LCD_CMD)  # 101000 Data length, number of lines, font size
    lcd_byte(0x01, LCD_CMD)  # 000001 Clear display
    time.sleep(E_DELAY)


def lcd_byte(bits, mode):
    # Send byte to data pins
    # bits = data
    # mode = True  for character
    #        False for command

    GPIO.output(LCD_RS, mode)  # RS

    # High bits
    GPIO.output(LCD_D4, 0)
    GPIO.output(LCD_D5, 0)
    GPIO.output(LCD_D6, 0)
    GPIO.output(LCD_D7, 0)
    if bits & 0x10 == 0x10:
        GPIO.output(LCD_D4, 1)
    if bits & 0x20 == 0x20:
        GPIO.output(LCD_D5, 1)
    if bits & 0x40 == 0x40:
        GPIO.output(LCD_D6, 1)
    if bits & 0x80 == 0x80:
        GPIO.output(LCD_D7, 1)

    # Toggle 'Enable' pin
    lcd_toggle_enable()

    # Low bits
    GPIO.output(LCD_D4, 0)
    GPIO.output(LCD_D5, 0)
    GPIO.output(LCD_D6, 0)
    GPIO.output(LCD_D7, 0)
    if bits & 0x01 == 0x01:
        GPIO.output(LCD_D4, 1)
    if bits & 0x02 == 0x02:
        GPIO.output(LCD_D5, 1)
    if bits & 0x04 == 0x04:
        GPIO.output(LCD_D6, 1)
    if bits & 0x08 == 0x08:
        GPIO.output(LCD_D7, 1)

    # Toggle 'Enable' pin
    lcd_toggle_enable()


def lcd_toggle_enable():
    # Toggle enable
    time.sleep(E_DELAY)
    GPIO.output(LCD_E, 1)
    time.sleep(E_PULSE)
    GPIO.output(LCD_E, 0)
    time.sleep(E_DELAY)


# Used to place the strings to be displayed so that ones that are longer than 16 characters 
# can be scrolled right to left to show it all.
def process_lcd_row(row):
    global lcd_pos

    start = lcd_pos[row]
    end = start + LCD_WIDTH
    maxl = len(lcd_lines[row])
    reset_flag = False
    if end > (maxl + 3):
        start = 0
        end = LCD_WIDTH
        reset_flag = True

    if end > maxl:
        line = lcd_lines[row][-1 * LCD_WIDTH:]
    else:
        line = lcd_lines[row][start: end]

    if row == 0:
        lcd_string(line, LCD_LINE_1)
    else:
        lcd_string(line, LCD_LINE_2)

    if reset_flag:
        start = 0
    else:
        start += 1
    lcd_pos[row] = start


# Triggered at 1 second rate to refresh display and support long text scrolling
def refresh_lcd():
    global lcd_pos

    process_lcd_row(0)
    process_lcd_row(1)


def lcd_string(message, line):
    # Send string to display
    message = message.ljust(LCD_WIDTH, " ")

    lcd_byte(line, LCD_CMD)

    for i in range(LCD_WIDTH):
        lcd_byte(ord(message[i]), LCD_CHR)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
    finally:
        lcd_byte(0x01, LCD_CMD)
        lcd_string("", LCD_LINE_1)
        GPIO.cleanup()
