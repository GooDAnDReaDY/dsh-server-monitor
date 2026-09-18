# MVP Test Matrix — Issue #1

## Unit

- profile normalization and validation;
- vault read/write/masking and file permissions;
- SSH command timeout and output limits;
- Linux snapshot parser for complete, missing-tool and malformed sections;
- per-section status normalization.

## Integration

- profile CRUD and trusted-request protection;
- snapshot route with one host, multiple hosts and partial collector failure;
- no secret material in settings/API/log payloads;
- plugin boots without dsh-remote-workspace.

## UI

- settings card registration;
- native sidebar primary surface;
- legacy BetterSidebar only;
- both surfaces;
- neither surface;
- loading, empty, success, partial, offline and error states;
- polling pause on hidden document;
- EN/ZH locale parity and external Russian locale compatibility.

## Package and security

- build and tests;
- npm pack dry-run allowlist;
- no internal paths, hosts, credentials or file dependencies;
- file-size limits;
- exact tgz test-server install and cleanup.

## Acceptance

All applicable checks pass with no known defects before merge or deploy approval.
