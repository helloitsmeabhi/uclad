#include <iostream>
#include <stdexcept>
#include <cstdlib>
#include <cstring>
#include <string>
#include <windows.h>
#include <thread>
#include <chrono>
#include <fstream>
#include <vector>
#if __has_include(<filesystem>)
    #include <filesystem>
    namespace fs = std::filesystem;
#elif __has_include(<experimental/filesystem>)
    #include <experimental/filesystem>
    namespace fs = std::experimental::filesystem;
#else
    #error "Neither <filesystem> nor <experimental/filesystem> are available"
#endif

using namespace std;

string findExtension(const string &filename) {
    size_t pos = filename.rfind('.');
    return (pos != string::npos) ? filename.substr(pos + 1) : "";
}

void executeCommand(const string &command) {
    int status = system(command.c_str());
    if (status != 0) {
        cerr << "Error executing command: " << command << endl;
        exit(1);  // Exit immediately on command failure
    }
}

string getPackageName(const string &filename) {
    ifstream file(filename);
    if (!file.is_open()) {
        cerr << "Error opening file: " << filename << endl;
        exit(1);
    }

    string line;
    while (getline(file, line)) {
        // Trim leading whitespace
        size_t start = line.find_first_not_of(" \t");
        if (start == string::npos) continue; // empty line
        line = line.substr(start);

        // Check if line starts with 'package'
        if (line.rfind("package ", 0) == 0) {
            size_t end = line.find(';');
            if (end == string::npos) {
                cerr << "Error: Invalid package declaration in " << filename << endl;
                exit(1);
            }
            string package = line.substr(7, end - 7); // "package ".length() is 7
            // Trim any trailing whitespace/comments
            size_t commentStart = package.find("//");
            if (commentStart != string::npos) {
                package = package.substr(0, commentStart);
            }
            // Trim whitespace
            size_t lastChar = package.find_last_not_of(" \t");
            if (lastChar != string::npos) {
                package = package.substr(0, lastChar + 1);
            } else {
                package.clear();
            }
            return package;
        }

        // Stop searching if we encounter a class or interface declaration
        if (line.rfind("public class ", 0) == 0 || line.rfind("class ", 0) == 0 || line.rfind("interface ", 0) == 0) {
            break;
        }
    }

    return ""; // no package
}

void executeJava(const string &javaFile) {
    // Step 1: Compile
    executeCommand("javac \"" + javaFile + "\"");

    // Step 2: Extract package name
    string packageName = getPackageName(javaFile);

    // Step 3: Determine class name and root path
    fs::path filePath(javaFile);
    string className = filePath.stem().string();

    vector<string> packageParts;
    if (!packageName.empty()) {
        size_t start = 0;
        while (true) {
            size_t end = packageName.find('.', start);
            if (end == string::npos) {
                packageParts.push_back(packageName.substr(start));
                break;
            }
            packageParts.push_back(packageName.substr(start, end - start));
            start = end + 1;
        }
    }

    fs::path rootPath = filePath.parent_path();
    for (const auto& part : packageParts) {
        if (rootPath == rootPath.root_directory()) {
            cerr << "Error: Package structure exceeds directory depth." << endl;
            exit(1);
        }
        rootPath = rootPath.parent_path();
    }

    string classpath = rootPath.string();
    string qualifiedName = packageName.empty() ? className : (packageName + "." + className);

    // Step 4: Run
    string command = "java -cp \"" + classpath + "\" " + qualifiedName;
    executeCommand(command);
}

void executeC(const string &cFile) {
    fs::path cFilePath(cFile);
    fs::path outputPath = cFilePath.parent_path() / cFilePath.stem();
    outputPath.replace_extension(".exe");
    string outputName = outputPath.string();
    executeCommand("clang -o \"" + outputName + "\" \"" + cFile + "\"");
    executeCommand("\"" + outputName + "\"");
}

void executeCpp(const string &cppFile) {
    fs::path cppFilePath(cppFile);
    fs::path outputPath = cppFilePath.parent_path() / cppFilePath.stem();
    outputPath.replace_extension(".exe");
    string outputName = outputPath.string();
    executeCommand("clang++ -o \"" + outputName + "\" \"" + cppFile + "\"");
    executeCommand("\"" + outputName + "\"");
}

void executePython(const string &pyFile) {
    executeCommand("python \"" + pyFile + "\"");
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        cerr << "Usage: " << argv[0] << " <filename>" << endl;
        return 1;
    }

    string filename = argv[1];
    string extension = findExtension(filename);

    if (extension == "java") {
        executeJava(filename);
    } else if (extension == "py") {
        executePython(filename);
    } else if (extension == "cpp") {
        executeCpp(filename);
    } else if (extension == "c") {
        executeC(filename);
    } else {
        cerr << "Error: Unsupported file extension '" << extension << "'." << endl;
        return 1;
    }

    return 0;
}