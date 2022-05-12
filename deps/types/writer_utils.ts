export type WriterUtils = {
  "version": "0.1.0",
  "name": "writer_utils",
  "instructions": [
    {
      "name": "write",
      "accounts": [
        {
          "name": "target",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "offset",
          "type": "u64"
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    }
  ]
};

export const IDL: WriterUtils = {
  "version": "0.1.0",
  "name": "writer_utils",
  "instructions": [
    {
      "name": "write",
      "accounts": [
        {
          "name": "target",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "offset",
          "type": "u64"
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    }
  ]
};
