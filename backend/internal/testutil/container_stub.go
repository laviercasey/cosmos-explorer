//go:build integration && !testcontainers

package testutil

import "testing"

func newContainerDSN(t *testing.T) (string, func(), bool) {
	t.Helper()
	return "", nil, false
}
