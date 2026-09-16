with open('tailor/app.js', 'rb') as f:
    lines = f.readlines()

line = lines[288]
idx = line.find(b'Upload Photos')
before = line[idx-3:idx]   # should be  "> or similar, whatever precedes
print("bytes before 'Upload Photos':", before)

after_title = line[idx+len(b'Upload Photos'):]
close_paren_idx = after_title.find(b'>')
print("bytes right after title text up to first >:", after_title[:close_paren_idx+1])

# find the actual '>' that closes the title attribute, then the corrupted emoji up to </button>
gt_idx = line.find(b'>', idx)
end_idx = line.find(b'</button>', gt_idx)
print("segment between attribute-close and </button>:", line[gt_idx:end_idx])

new_line = line[:gt_idx+1] + b'<img src=\\"../assets/28_camera.png\\" alt=\\"Upload Photos\\">' + line[end_idx:]
lines[288] = new_line

with open('tailor/app.js', 'wb') as f:
    f.writelines(lines)

print("DONE")
