package middleware

import "sync/atomic"

func atomicStore(p *int64, v int64) { atomic.StoreInt64(p, v) }
func atomicLoad(p *int64) int64     { return atomic.LoadInt64(p) }
