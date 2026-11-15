import { run } from './harness';
const src = `ptr a = alloc(4)
write(a, 42)
print(str(read(a)))
print(a)
ptr b = a + 1
write(b, 7)
print(str(read(b)))
print(str(read(a)))
int n = 5
ptr p = addr(n)
write(p, 9)
print(str(n))
list xs = [1, 2, 3]
ptr q = addr(xs, 1)
write(q, 99)
print(str(xs))
print(str(type(a)))
print(str(a + 2))
free(a)
`;
const r = await run(src, { timeoutMs: 5000 });
console.log(r.out.join('\n'));
if (r.err.length) console.log('ERR', r.err.join(' | '));
