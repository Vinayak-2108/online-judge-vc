import subprocess
import os

def compile_code(file_path,lang):
    if lang == 'c':
        compiler = 'gcc'
    elif lang == 'cpp':
        compiler = 'g++'
    else:
        return
    
    try:
        curr_dir = os.getcwd()
        os.chdir("home/dump")
        subprocess.run([compiler, file_path], capture_output=True)
        os.chdir(curr_dir)
    except:
        print("Error occured while compiling")
        

def exec_code(lang,ip_data):
    curr_dir = os.getcwd()
    try:
        os.chdir("home\dump")
        if lang == 'py':
            result = subprocess.run(['python','temp.py'],input=ip_data.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=5)
        else:
            result = subprocess.run(['./a.exe'],input=ip_data.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=5)
         
        os.chdir(curr_dir)
        stdout_output = result.stdout
        stderr_output = result.stderr

        if result.returncode != 0:
            raise subprocess.CalledProcessError(result.returncode, cmd=result.args, output=result.stdout, stderr=result.stderr)

        return result.stdout.decode('utf8')
    
    except FileNotFoundError as e:
        print(f"Error: {e.filename} not found.")
        return "Error: File not found."
    except PermissionError as e:
        print(f"Error: Permission denied for {e.filename}.")
        os.chdir(curr_dir)
        return "Error: Permission denied."
    except subprocess.CalledProcessError as e:
        print(f"Error: Command {e.cmd} returned a non-zero exit code {e.returncode}.")
        print(f"Standard Output: {e.output}")
        print(f"Standard Error: {e.stderr}")
        os.chdir(curr_dir)
        return "Error: Code execution failed."
    except subprocess.TimeoutExpired as e:
        print(f"Error: Code execution timed out. {e}")
        os.chdir(curr_dir)
        return "Error: Code execution timed out."
    except Exception as e:
        print(f"Error occurred while executing the code: {e}")
        os.chdir(curr_dir)
        return "Error occurred while executing the code."

def check_tc(tc, lang):
    flag = 1
    j = 0
    idx = 0
    for i in tc:
        j+=1
        result = exec_code(lang,str(i.tc_input).replace(' ','\n'))
        
        if result != i.expected_output:
            flag=0
            idx=j
            break
    
    if flag == 0:
        return f'Wrong Answer on tc {idx}'
    else:
        return "Accepted"
